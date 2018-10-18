//var assert = require('assert');
var request = require('supertest');
//var mongoose = global.mongodb_package;
var async = require('async');
var server = require('../../server');
var util = require('../support/util');


describe('Cron', function() {
  beforeEach((done) => {
    async.parallel([
      function(cb) {
        global.mongodb_package.collections.users.remove({}, function(err) {
          cb(err);
        });
      },
      function(cb) {
        global.mongodb_package.collections.spaces.remove({}, function(err) {
          cb(err);
        });
      }
    ], function(err, result) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  describe('generar base de datos', () => {
    it('completa de encomiendas', (done) => {
      util.createSpaceWithUser((err) => {
        if (err) {
          return done(err);
        }
        request(server)
          .get('/cron/modules')
          .set('Accept', 'application/json')
          //.expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            console.log(res.body);
            setTimeout(done, 0);
          });
      });
    });
  });
});
