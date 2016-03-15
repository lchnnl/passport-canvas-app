'use strict';
require('./server');
const assert    = require('assert');
const Crypto    = require('crypto');
const nock      = require('nock');
const request   = require('request');


const OAUTH_TOKEN     = '00D000';
const SECRET          = 'FC99';
const ORGANIZATION_ID = '000123';
const USER_ID         = '000456';
const ACCOUNT_ID      = '001xx1';
const URL             = 'http://localhost:3001/';


// Returns new data for a request to authenticate Assaf
function canvasData() {
  return {
    client: {
      oauthToken:      OAUTH_TOKEN
    },
    context: {
      organization: {
        organizationId: ORGANIZATION_ID
      },
      user: {
        userId:         USER_ID,
        fullName:       'Assaf Arkin',
        email:          'assaf@broadly.com'
      },
      environment: {
        parameters: {
          page:         'special'
        },
        record: {
          Id:           ACCOUNT_ID
        }
      }
    }
  };
}


/* eslint-disable camelcase */
const idUrl = `/id/${ORGANIZATION_ID}/${USER_ID}`;
nock('https://login.salesforce.com')
  .get(idUrl)
  .query({
    format:      'json',
    oauth_token: OAUTH_TOKEN
  })
  .reply(200, {
    id:              `https://login.salesforce.com${idUrl}`,
    user_id:         USER_ID,
    organization_id: ORGANIZATION_ID,
    display_name:    'Assaf Arkin',
    email:           'assaf@broadly.com'
  });
/* eslint-enable camelcase */


// Returns a signed request with the given content and signature
// If signature is missing, calculates using SECRET
function addSignature(encoded, signature) {
  const signed = `${signature === undefined ? sign(encoded, SECRET) : signature}.${encoded}`;
  const params = {
    signed_request: signed // eslint-disable-line camelcase
  };
  return params;
}

// Encodes a JavaScript object to be the payload of the signed request
function encode(data) {
  const json     = JSON.stringify(data);
  const encoded  = new Buffer(json).toString('base64');
  return encoded;
}

// Uses HMAC SHA-256 to calculate a signature for raw using secret
function sign(raw, secret) {
  const hmac   = Crypto.createHmac('sha256', secret || SECRET);
  const digest = hmac.update(raw).digest('base64');
  return digest;
}


describe('Request to Canvas endpoint', function() {

  describe('body is not URL encoded', function() {

    it('should respond with 403', function(done) {
      const signed = addSignature(encode(canvasData()));
      request.post(URL, { body: signed.toString() }, function(error, response) {
        assert.equal(response.statusCode, 403);
        assert.equal(response.body, 'Forbidden');
        done(error);
      });
    });

  });


  describe('body has no signed_request', function() {

    it('should respond with 403 Forbidden', function(done) {
      request.post(URL, { form: 'request=anything' }, function(error, response) {
        assert.equal(response.statusCode, 403);
        assert.equal(response.body, 'Forbidden');
        done(error);
      });
    });

  });


  describe('signed_request not base 64 encoded', function() {

    it('should respond with 403 Forbidden', function(done) {
      request.post(URL, { form: addSignature('nonsense') }, function(error, response) {
        assert.equal(response.statusCode, 403);
        assert.equal(response.body, 'Forbidden');
        done(error);
      });
    });

  });


  describe('signed_request has no signature', function() {

    it('should respond with 403 Forbidden', function(done) {
      request.post(URL, { form: addSignature(encode(canvasData()), '') }, function(error, response) {
        assert.equal(response.statusCode, 403);
        assert.equal(response.body, 'Forbidden');
        done(error);
      });
    });

  });


  describe('signed_request has invalid signature', function() {

    it('should respond with 403 Forbidden', function(done) {
      request.post(URL, { form: addSignature(encode(canvasData()), 'signature') }, function(error, response) {
        assert.equal(response.statusCode, 403);
        assert.equal(response.body, 'Forbidden');
        done(error);
      });
    });

  });


  describe('signed_request signed with wrong secret', function() {

    it('should respond with 403 Forbidden', function(done) {
      const signature = sign(encode(canvasData()), 'somesecret');
      request.post(URL, { form: addSignature(encode(canvasData()), signature) }, function(error, response) {
        assert.equal(response.statusCode, 403);
        assert.equal(response.body, 'Forbidden');
        done(error);
      });
    });

  });


  describe('signed_request with no client', function() {

    it('should respond with 403 Forbidden', function(done) {
      const noClient = canvasData();
      delete noClient.client;
      request.post(URL, { form: addSignature(encode(noClient)) }, function(error, response) {
        assert.equal(response.statusCode, 403);
        assert.equal(response.body, 'Forbidden');
        done(error);
      });
    });

  });


  describe('signed_request with no user', function() {

    it('should respond with 403 Forbidden', function(done) {
      const noUser = canvasData();
      delete noUser.context.user;
      request.post(URL, { form: addSignature(encode(noUser)) }, function(error, response) {
        assert.equal(response.statusCode, 403);
        assert.equal(response.body, 'Forbidden');
        done(error);
      });
    });

  });


  describe('signed_request with no organization', function() {

    it('should respond with 403 Forbidden', function(done) {
      const noOrganization = canvasData();
      delete noOrganization.context.organization;
      request.post(URL, { form: addSignature(encode(noOrganization)) }, function(error, response) {
        assert.equal(response.statusCode, 403);
        assert.equal(response.body, 'Forbidden');
        done(error);
      });
    });

  });


  describe('signed_request with different organization', function() {

    it('should respond with 403 Forbidden', function(done) {
      const diffOrganization = canvasData();
      diffOrganization.context.organization.organizationId = '00DDDD';
      request.post(URL, { form: addSignature(encode(diffOrganization)) }, function(error, response) {
        assert.equal(response.statusCode, 403);
        assert.equal(response.body, 'Forbidden');
        done(error);
      });
    });

  });


  describe('with a Assaf of Broadly', function() {

    let statusCode;
    let body;

    before(function(done) {
      const signed = addSignature(encode(canvasData()));
      request.post(URL, { form: signed, json: true }, function(error, response) {
        statusCode = response.statusCode;
        body       = response.body;
        done(error);
      });
    });

    it('should retrieve resource', function() {
      assert.equal(statusCode, 200);
    });

    it('should login user with ID 000123/000456', function() {
      const id = body.user.id;
      assert.equal(id, 'https://login.salesforce.com/id/000123/000456');
    });

    it('should login user with organization ID 000456', function() {
      const organizationID = body.user.organization_id;
      assert.equal(organizationID, '000123');
    });

    it('should login user with user ID 000456', function() {
      const userID = body.user.user_id;
      assert.equal(userID, '000456');
    });

    it('should login user with name Assaf Arkin', function() {
      const name = body.user.display_name;
      assert.equal(name, 'Assaf Arkin');
    });

    it('should login user with email assaf@broadly.com', function() {
      const email = body.user.email;
      assert.equal(email, 'assaf@broadly.com');
    });

    it('should pass Canvas element parameters in the body', function() {
      const parameters = body.parameters;
      assert.equal(parameters.page, 'special');
    });

    it('should pass Salesforce record in the body', function() {
      const record = body.record;
      assert.equal(record.Id, '001xx1');
    });
  });

});
