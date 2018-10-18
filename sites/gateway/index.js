var config = require('../../config');

var MongoClient = require('mongodb').MongoClient;



var mongodb_credentials = config.db.mongodb_modules.url;
// Use connect method to connect to the Server
MongoClient.connect(mongodb_credentials, function (err, db) {
  //console.log("Connected correctly to server");
  global.db = db;
});

var controllers = require('./controllers');

module.exports = (app) => {
  //solo existe para test, elimina variables
  if (process.env.NODE_ENV === 'test') {
    app.get('/clean', controllers.Test.clean);
  }
  //regresa un token valido para usar
  app.post('/v1/login/:componet/:module', controllers.ApiKey, controllers.Users.loginPost);
  //inserta
  app.post('/v1/:componet/:module', controllers.ApiKey, controllers.Posts);
  //busca
  app.get('/v1/:componet/:module', controllers.ApiKey, controllers.Queries);
  //busca
  app.get('/v1/:componet/:module/count', controllers.ApiKey, controllers.Counts);
  //detalle
  app.get('/v1/:componet/:module/:id([0-9a-fA-F]{24})', controllers.ApiKey, controllers.Gets);
  //edita
  app.put('/v1/:componet/:module/:id([0-9a-fA-F]{24})', controllers.ApiKey, controllers.Puts);
  //inactiva
  app.delete('/v1/:componet/:module/:id([0-9a-fA-F]{24})', controllers.ApiKey, controllers.Deactivates);
  //activa
  app.put('/v1/activate/:componet/:module/:id([0-9a-fA-F]{24})', controllers.ApiKey, controllers.Activates);
  //elimina
  app.delete('/v1/delete/:componet/:module/:id([0-9a-fA-F]{24})', controllers.ApiKey, controllers.Deletes);
  //aggregate
  app.post('/v1/aggregate/:componet/:module', controllers.ApiKey, controllers.Aggregate);


  //inserta un elemento en un array
  app.post('/v1/array/:componet/:module/:field/:id([0-9a-fA-F]{24})', controllers.ApiKey, controllers.Pushs);
  //elimina un elemento en un array
  app.delete('/v1/array/:componet/:module/:field/:id([0-9a-fA-F]{24})/:field_id([0-9a-fA-F]{24})', controllers.ApiKey, controllers.Pulls);

  //cambio a dos pasos
  app.put('/v1/transaction/:componet', controllers.ApiKey, controllers.Transactions);
  //acciones que requeren que los datos sean cargados desde un servidor
  app.put('/v1/action/:componet', controllers.ApiKey, controllers.Actions);

  //edita
  app.put('/v1/:componet/:module', controllers.ApiKey, controllers.Updates);

};