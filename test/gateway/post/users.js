//var assert = require('assert');
var request = require('supertest');
//var mongoose = global.mongodb_package;
var async = require('async');
var server = require('../../../server');
var util = require('../../support/util');

describe('Procesos de POST para el tipo usuario', function() {
  //valores de constantes

  after(() => {
    global.mongodb_package.close();
  });

  before((done) => {
    async.waterfall([

      function(callback) {
        global.mongodb_package.collections.spaces.drop(function(err) {
          console.log('Collection spaces as dropped');
          callback(err);
        });
      },
      function(callback) {
        global.mongodb_package.collections.users.drop(function(err) {
          console.log('Collection users as dropped');
          callback(err);
        });
      }
    ], function(err, result) {
      if (err) {
        console.log(err);
        return done(err);
      }
      done();
    });
  });

  describe('Insertar Usuario', function() {
    it('petición al server', function(done) {
      request(server)
        .get('/')
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('creación de cuenta de usuario', function(done) {
      util.createUser(server, done);
    });
  });
});
