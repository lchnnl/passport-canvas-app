## Passport.js authentication strategy for Salesforce Canvas App (POST signed requests)


```js
// Strategy requires the consumer secret to verify the request
const consumerSecret = 'shhhh ...';
const strategy = new Strategy({ consumerSecret }, verifyUser);

server.use(bodyParser.urlencoded({ extended: true }));
passport.use(strategy);


// Maybe you want to check the user belongs to your organization

const myOrganizationId = '0000...';
function verifyUser(accessToken, profile, done) {
  if (profile.organization_id === myOrganizationId) {
    const user = context.user;
    done(null, user);
  } else
    done(null, false);
}

// The endpoint for the Canvas App is always a POST request.
//
// The request body will contain the canvasApp parameters and any record
// associated with the page layout.
const authenticate = passport.authenticate('canvas-app');
server.post('/', authenticate, function(req, res) {
  const accountId = req.record.Id;
  const page      = req.parameters.page;
  const url       = `/account/${accountId}/${page}`;
  res.redirect(url);
});
```
