## Passport.js authentication strategy for Salesforce Canvas App (POST signed requests)


### Setup

In order to use this Strategy, you'll need a Connected App with `Force.com Canvas` enabled, `Canvas App URL` that points to the authenticate endpoint, and `Access Method` set to `Signed Request (POST)`.


### Strategy

Create a strategy using the connected app consumer secret:

```js
const strategy = new Strategy({
  consumerSecret: '....'
}, function verifyUser(token, profile, done) {
  console.log(profile);
  return done(null, profile);
});
```


### Authenticate

You will need to authenticate the canvas app endpoint, responding to POST (not GET) request:

```js
app.post('/',
  passport.authenticate('canvas-app'),
  function canvasAppPage(req, res) {
    res.render('index', {
      parameters: req.body.parameters,
      record:     req.body.record,
      user:       req.user
    });
  }
)
```

If you are using sessions, don't forget to limit the session duration, and to reject unauthenticated requests on all other routes/methods.

```js
app.use(function requireAuthentication(req, res, next) {
  if (req.isAuthenticated())
    next();
  else
    res.sendStatus(403);
});
```


### User profile

The user profile is available from `req.user`:

```js
req.user
=> {
  id:              'https://login.salesforce.com/id/00Dx00000001hxyEAA/005x0000001SyyEAAS',
  organization_id: '00Dx00000001hxyEAA',
  user_id:         '005x0000001SyyEAAS',
  display_name:    'Sean Forbes',
  email:           'admin@6457617734813492.com'
}
```


### Parameters

If the `apex:canvasApp` component specifies any parameters, these parameters are available from `req.body.parameters`:

```html
<apex:canvasApp parameters="{count: 2}" ... />
```

```js
req.body.parameters
=> {
  count: 2 
}
```


### Record

If the canvas app appears in association with an object, information about that object, and its fields, are available from `req.body.record`:

```js
req.body.record
=> {
  attributes: {
    type: 'Account',
    url: '/services/data/v36.0/sobjects/Account/001xx000003DGWiAAO'
  },
  Id: '001xx000003DGWiAAO',
  Phone: '(555) 555-5555',
  Fax: '(555) 555-5555',
  BillingCity: 'Seattle'
}
```

