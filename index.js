'use strict';
const assert     = require('assert');
const Crypto     = require('crypto');
const Passport   = require('passport-strategy');
const request    = require('request');


module.exports = class CanvasAppStrategy extends Passport.Strategy {

  constructor(options, verify) {
    assert(options && options.consumerSecret, 'Consumer secret required');
    assert(typeof verify === 'function', 'Canvas strategy requires a verify callback');

    super();
    this.name     = 'canvas-app';
    this._options = options;
    this._verify  = verify;
  }


  authenticate(req) {
    Promise.resolve()
      .then(() => {
        return this._verifySignature(req);
      })
      .then(result => {

        if (result) {
          Object.assign(req.body, result.body);
          this.success(result.user);
        } else
          this.pass();

      })
      .catch(error => {
        this.fail(403, error.message);
      });
    return null;
  }


  // Verify request signature using consumer key, then proceed to verify user.
  // Resolves to user, or nothing if this is not a Canvas App signed request.
  _verifySignature(req) {
    const isPostMethod      = (req.method === 'POST');
    const signedRequest     = req.body.signed_request;
    if (isPostMethod && signedRequest) {

      const parts             = signedRequest.split('.');
      assert.equal(parts.length, 2);
      const actualSignature   = parts[0] || '';
      const encoded           = parts[1] || '';

      const consumerSecret    = this._options.consumerSecret;
      assert(consumerSecret);
      const expectedSignature = signatureFor(encoded, consumerSecret);
      assert.equal(actualSignature, expectedSignature);

      return this._verifyUser(req, encoded);

    } else
      return null;
  }


  // Call the user supplied verify function and pass it the client and context
  // data.  Resolves to { user, body } if this user was authenticated.
  _verifyUser(req, encoded) {
    const data = decodeEnvelope(encoded);
    return loadUserProfile(data)
      .then(profile => this._verifyAsync(data, profile))
      .then(user => {
        // These should be added to request body
        const body = data.context.environment;
        return { user, body };
      });
  }


  // Call _verify and resolve to a user object
  _verifyAsync(data, profile) {
    return new Promise((resolve, reject) => {
      const accessToken = data.client.oauthToken;
      this._verify(accessToken, profile, (error, user, info) => {
        if (user)
          resolve(user);
        else if (error)
          reject(error);
        else
          reject(new Error(info || 'Not an authorized user'));
      });
    });
  }

};


function decodeEnvelope(encoded) {
  const json  = new Buffer(encoded, 'base64').toString();
  const data  = JSON.parse(json);
  return data;
}


// Calculate and return signature so we can authenticate the request
function signatureFor(encoded, secret) {
  const hmac       = Crypto.createHmac('sha256', secret);
  const signature  = hmac.update(encoded).digest('base64');
  return signature;
}


// Verify that the access token is still valid, avoid replay attacks

// Load user profile via REST API, resolves to userInfo
//
// We have all the user information in data, but we want to avoid replay
// attacks, and since issuedAt is useless at the moment, our best bet is to
// verify the access token is still fresh by loading the user profile via the
// REST API.
function loadUserProfile(data) {
  const userId         = data.context.user.userId;
  const organizationId = data.context.organization.organizationId;
  const url            = `https://login.salesforce.com/id/${organizationId}/${userId}`;
  const accessToken    = data.client.oauthToken;
  const query          = {
    format:      'json',
    oauth_token: accessToken // eslint-disable-line camelcase
  };

  return new Promise(function(resolve, reject) {
    request({ url, qs: query, json: true }, function(error, response) {
      if (error)
        reject(error);
      else {
        assert.equal(response.statusCode, 200);
        resolve(response.body);
      }
    });
  });
}

