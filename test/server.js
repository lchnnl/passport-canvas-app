'use strict';
const bodyParser = require('body-parser');
const Strategy   = require('../');
const Express    = require('express');
const Passport   = require('passport').Passport;


const SECRET          = 'FC99';
const ORGANIZATION_ID = '000123';


// Express servers for testing
const server   = new Express();
const passport = new Passport();
const strategy = new Strategy({ consumerSecret: SECRET }, verifyUser);

passport.serializeUser(function(user, callback) {
  callback(null, user);
});
passport.deserializeUser(function(object, callback) {
  callback(null, object);
});

server.use(passport.initialize());
server.use(passport.session());

server.use(bodyParser.urlencoded({ extended: true }));
passport.use(strategy);


server.post('/', passport.authenticate('canvas-app'));
server.post('/', function(req, res) {
  if (req.isAuthenticated()) {
    res.send({
      user:       req.user,
      parameters: req.body.parameters,
      record:     req.body.record
    });
  } else
    res.sendStatus(403);
});


function verifyUser(accessToken, profile, done) {
  if (profile.organization_id === ORGANIZATION_ID)
    done(null, profile);
  else
    done(null, false);
}


before(function(done) {
  server.listen(3001, done);
});
