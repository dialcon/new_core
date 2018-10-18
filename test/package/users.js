//var assert = require('assert');
var request = require('supertest');
//var mongoose = global.mongodb_package;
var async = require('async');
var server = require('../../server');
var util = require('../support/util');

describe('Cuentas', function() {
  beforeEach((done) => {
    async.parallel([
      function(cb) {
        global.mongodb_package.collections.users.remove({}, function(err) {
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

  describe('signup', () => {
    it('sin datos', (done) => {
      request(server)
        .post('/signup')
        .set('Accept', 'application/json')
        .send({})
        .expect(400)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          setTimeout(done, 0);
        });
    });

    it('algunos datos', (done) => {
      request(server)
        .post('/signup')
        .set('Accept', 'application/json')
        .send({
          email: 'test@test.com',
          password: '123456'
        })
        .expect(400)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          setTimeout(done, 0);
        });
    });

    it('datos no validos, correo malo, contraseña corta', (done) => {
      request(server)
        .post('/signup')
        .set('Accept', 'application/json')
        .send({
          name: 'test',
          email: 'test',
          password: '1'
        })
        .expect(400)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          setTimeout(done, 0);
        });
    });

    it('nueva cuenta', (done) => {
      request(server)
        .post('/signup')
        .set('Accept', 'application/json')
        .send({
          name: 'test',
          email: 'test@test.com',
          password: '123456'
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          setTimeout(done, 0);
        });
    });

    it('cuenta repetida', (done) => {
      util.createUser((err) => {
        if (err) {
          return done(err);
        }
        request(server)
          .post('/signup')
          .set('Accept', 'application/json')
          .send({
            name: 'test',
            email: 'test@test.com',
            password: '123456'
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
  });
});
