var controllers = require('./controllers');

module.exports = (app) => {
  app.post('/contact', controllers.Contacts.contactPost);
  app.put('/account', controllers.Users.ensureAuthenticated, controllers.Users.accountPut);
  app.delete('/account', controllers.Users.ensureAuthenticated, controllers.Users.accountDelete);
  app.post('/signup', controllers.Users.signupPost);
  app.post('/login', controllers.Users.loginPost);
  app.post('/forgot', controllers.Users.forgotPost);
  app.post('/reset/:token', controllers.Users.resetPost);
  app.get('/unlink/:provider', controllers.Users.ensureAuthenticated, controllers.Users.unlink);
  app.post('/auth/facebook', controllers.Users.authFacebook);
  app.get('/auth/facebook/callback', controllers.Users.authFacebookCallback);
  app.post('/auth/google', controllers.Users.authGoogle);
  app.get('/auth/google/callback', controllers.Users.authGoogleCallback);

  //creación de paquetes
  app.get('/spaces', controllers.Users.ensureAuthenticated, controllers.Spaces.list);
  app.get('/spaces/:id([0-9a-fA-F]{24})', controllers.Users.ensureAuthenticated, controllers.Spaces.view);
  app.post('/spaces', controllers.Users.ensureAuthenticated, controllers.Spaces.new);
  app.get('/spaces/summary', controllers.Users.ensureAuthenticated, controllers.Spaces.summary);

  // app.put('/spaces/:id', controllers.Users.ensureAuthenticated, controllers.Spaces.edit);
  //
  // creación de apikey
  app.get('/apikey/:space', controllers.Users.ensureAuthenticated, controllers.ApiKeys.list);
  app.post('/apikey', controllers.Users.ensureAuthenticated, controllers.ApiKeys.new);

  app.post('/spaces/:id([0-9a-fA-F]{24})/modules', controllers.Users.ensureAuthenticated, controllers.Modules.new);
  app.get('/spaces/:id([0-9a-fA-F]{24})/modules', controllers.Users.ensureAuthenticated, controllers.Modules.list);
  app.get('/spaces/:id([0-9a-fA-F]{24})/modules/:module([0-9a-fA-F]{24})', controllers.Users.ensureAuthenticated, controllers.Modules.view);
  app.put('/spaces/:id([0-9a-fA-F]{24})/modules/:module([0-9a-fA-F]{24})', controllers.Users.ensureAuthenticated, controllers.Modules.edit);

  app.get('/spaces/:id([0-9a-fA-F]{24})/states_machines', controllers.Users.ensureAuthenticated, controllers.StatesMachines.list);
  app.get('/spaces/:id([0-9a-fA-F]{24})/states_machines/:state_machine([0-9a-fA-F]{24})', controllers.Users.ensureAuthenticated, controllers.StatesMachines.list);
  app.post('/spaces/:id([0-9a-fA-F]{24})/states_machines', controllers.Users.ensureAuthenticated, controllers.StatesMachines.new);
  app.put('/spaces/:id([0-9a-fA-F]{24})/states_machines/:state_machine([0-9a-fA-F]{24})', controllers.Users.ensureAuthenticated, controllers.StatesMachines.edit);


  //actualización de la db de dynamo
  app.get('/cron/modules', controllers.Spaces.cron);
};
