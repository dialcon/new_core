//var assert = require('assert');
var request = require('supertest');
//var mongoose = global.mongodb_package;
var async = require('async');
var server = require('../../server');
var util = require('../support/util');


describe('ApiKey', function() {
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

  describe('crear', () => {
    it('sin login apikey a un espacio que no existe', (done) => {
      util.createSpaceWithUser((err) => {
        if (err) {
          return done(err);
        }
        request(server)
          .post('/apikey')
          .set('Accept', 'application/json')
          .send({
            name: 'server',
            space: 'noexiste'
          })
          //.expect(401)
          .end((err, res) => {
            console.log(res);
            if (err) {
              return done(err);
            }
            setTimeout(done, 0);
          });
      });
    });

    it('apikey a un espacio que no existe', (done) => {
      async.auto({
        createSpaceWithUserAndLogin: (cb) => {
          util.createSpaceWithUserAndLogin(server, cb);
        }
      }, (err, results) => {
        request(server)
          .post('/apikey')
          .set('Accept', 'application/json')
          .set('Authorization', `Token ${results.createSpaceWithUserAndLogin.login}`)
          .send({
            name: 'server',
            space: 'noexiste'
          })
          .expect(400)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            setTimeout(done, 0);
          });

      });
    });

    it('apikey correcta', (done) => {
      async.auto({
        createSpaceWithUserAndLogin: (cb) => {
          util.createSpaceWithUserAndLogin(server, cb);
        }
      }, (err, results) => {
        request(server)
          .post('/apikey')
          .set('Accept', 'application/json')
          .set('Authorization', `Token ${results.createSpaceWithUserAndLogin.login}`)
          .send({
            name: 'server',
            space: 'encomiendas'
          })
          //.expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            setTimeout(done, 0);
          });

      });
    });
  });
});
