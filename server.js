require('./constants');
var config = require('./config');

var express = require('express');
var path = require('path');
var morgan = require('morgan');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var mongoose = require('mongoose');
var redis = require("redis");
var i18n = require("i18n");
var app = express();

global.path = __dirname;

let dbOptionsForSharedCluster = {
  autoReconnect: true,
  promiseLibrary: global.Promise,
  ssl: true,
  authSource: 'tracking'
};

if (process.env.TEST === 'yes') {
  dbOptionsForSharedCluster = {
    autoReconnect: true,
    promiseLibrary: global.Promise
  };
}

let dbOptionsForReplicaSet = {
  autoReconnect: true,
  promiseLibrary: global.Promise
  /*,
    replicaSet: 'rs0'*/
};

if (process.env.TEST === 'yes') {
  dbOptionsForReplicaSet = {
    autoReconnect: true,
    promiseLibrary: global.Promise
  };
}

//databases
mongoose.Promise = require('bluebird');
global.mongodb_package = mongoose.createConnection(config.db.mongodb_package.url, Object.assign({}, dbOptionsForReplicaSet));
global.mongodb_package.on('connected', function () {
  console.log('MongoDB connection open to ' + config.db.mongodb_package.url);
});
global.mongodb_package.on('error', function (err) {
  console.log('MongoDB Connection Error. Please make sure that MongoDB is running (Package).', err);
  process.exit(1);
});

//
global.mongodb_modules = mongoose.createConnection(config.db.mongodb_modules.url, Object.assign({}, dbOptionsForReplicaSet));
global.mongodb_modules.on('connected', function () {
  console.log('MongoDB connection open to ' + config.db.mongodb_modules.url);
});
global.mongodb_modules.on('error', function (err) {
  console.log('MongoDB Connection Error. Please make sure that MongoDB is running. (Modules)', err);
  process.exit(1);
});

//

// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });
global.clientRedis = redis.createClient(config.db.redis.url);
global.clientRedis.select(2, () => {});
global.clientRedis.on("connect", function () {
  console.log('Redis connection open to ' + config.db.redis.url);
  global.clientRedis.flushdb(function (err, succeeded) {
    console.log('Delete cache');
  });
});
global.clientRedis.on("error", function (err) {
  console.log("Error " + err);
});


i18n.configure({
  locales: ['es'],
  directory: __dirname + '/locales',
  queryParameter: 'lang',
});
global.__ = i18n.__;

//por of service
var port = (process.env.VCAP_APP_PORT || config.sites[process.env.SERVER_MODE_ENV].port);
app.set('port', port);

//middleware
app.use(i18n.init);
app.use(compression());
app.use(morgan(function (tokens, req, res) {
  return [
    tokens.date(req, res, 'clf'),
    tokens.method(req, res),
    tokens.url(req, res).split('?')[0],
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms'
  ].join(' ');
}));

app.use(bodyParser.json({
  limit: '1024mb'
}));
app.use(bodyParser.urlencoded({
  limit: '1024mb',
  extended: true,
  keepExtensions: true,
  parameterLimit: 1000000,
  defer: true
}));
app.use(require('./libs/crossdomain'));

app.use(expressValidator({
  customValidators: {
    array: function (value) {
      return Array.isArray(value);
    },
    gte: function (param, num) {
      return param >= num;
    }
  }
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(require('./libs/auth'));

require('./sites/' + process.env.SERVER_MODE_ENV)(app);

app.get('/', function (req, res) {
  var server = config.sites[process.env.SERVER_MODE_ENV];
  var memory = process.memoryUsage();
  memory = {
    rss: memory.rss / 1048576,
    heapTotal: memory.heapTotal / 1048576,
    heapUsed: memory.heapUsed / 1048576
  };
  res.status(200).send({
    name: server.name,
    description: server.description,
    memory: memory
  });
});

// Production error handler
if (app.get('env') === 'production') {
  app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.sendStatus(err.status || 500);
  });
}

//404
app.use(function (req, res, next) {
  res.status(404);
  // respond with json
  if (req.accepts('json') || req.accepts('html')) {
    return res.send({
      error: 'NOT FOUND'
    });
  }
  res.type('txt').send('NOT FOUND');
});

app.listen(app.get('port'), function () {
  console.log(
    '+============================================================+\n' +
    '|                      START SERVER                      |\n' +
    '+============================================================+\n' +
    'Iniciado el ' + new Date() + '\n' +
    '*** ' + config.sites[process.env.SERVER_MODE_ENV].name + '\n' +
    '*** ' + config.sites[process.env.SERVER_MODE_ENV].description + '\n' +
    'Escuhando en http://localhost:' + app.get('port')
  );
});


function closeConnections(code) {
  global.mongodb_package.close();
  global.mongodb_modules.close();
  process.exit(code);
}

process.on('uncaughtException', (err) => {
  console.error(err.stack);
  console.log('uncaughtException');
  closeConnections(1);
});

process.on('SIGHUP', (err) => {
  console.log('SIGHUP');
  closeConnections(7);
});

process.on('SIGTERM', (err) => {
  console.log('SIGTERM');
  closeConnections(128);
});

process.on('SIGUSR2', (err) => {
  console.log('SIGUSR2');
  closeConnections(1);
});

module.exports = app;