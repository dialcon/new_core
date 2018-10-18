//var assert = require('assert');
var request = require('supertest');
var _ = require('lodash');
//var mongoose = global.mongodb_package;
var async = require('async');
var server = require('../../server');
var util = require('../support/util');

describe('Espacios', function() {
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
    it('sin login', (done) => {
      request(server)
        .post('/spaces')
        .set('Accept', 'application/json')
        .send({})
        .expect(401)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          setTimeout(done, 0);
        });
    });

    it('sin datos', (done) => {
      async.auto({
        createAndLoginUser: (cb) => {
          util.createAndLoginUser(server, cb);
        }
      }, (err, results) => {
        request(server)
          .post('/spaces')
          .set('Accept', 'application/json')
          .set('Authorization', `Token ${results.createAndLoginUser}`)
          .send({})
          .expect(400)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            setTimeout(done, 0);
          });

      });
    });

    it('espacio completo', (done) => {
      async.auto({
          createAndLoginUser: (cb) => {
            util.createAndLoginUser(server, cb);
          },
          createSpace: ['createAndLoginUser', (results, cb) => {
            request(server)
              .post('/spaces')
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                name: 'encomiendas'
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          addModules1: ['createSpace', (results, cb) => {
            request(server)
              .post(`/spaces/${results.createSpace._id}/modules`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                name: 'users',
                module_type: 'user'
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          editModules1: ['addModules1', (results, cb) => {
            var module = _.first(results.addModules1.modules);
            request(server)
              .put(`/spaces/${results.addModules1._id}/modules/${module._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                'fields': {
                  'personalInfo': {
                    'toObject': true
                  },
                  'personalInfo-firstname': {
                    'notEmpty': true,
                    'errorMessage': 'personalInfoFirstName es requerido'
                  },
                  'personalInfo-lastname': {
                    'notEmpty': true,
                    'errorMessage': 'personalInfoLastName es requerido'
                  },
                  'email': {
                    'notEmpty': true,
                    'isEmail': {
                      'errorMessage': 'isEmail es inválido'
                    },
                    'errorMessage': 'isEmail es requerido'
                  },
                  'password': {
                    'notEmpty': true,
                    'isLength': {
                      'options': [{
                        'min': 8
                      }],
                      'errorMessage': 'password debe contener al menos 8 caracteres'
                    },
                    'errorMessage': 'password es requerido'
                  }
                },
                'fields_type': {
                  'personalInfo': 'T',
                  'personalInfo-firstname': 'S',
                  'personalInfo-lastname': 'S',
                  'email': 'S',
                  'password': 'S'
                },
                'keys': {
                  'email': 'UNIQUE'
                }
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          addModules2: ['createSpace', (results, cb) => {
            request(server)
              .post(`/spaces/${results.createSpace._id}/modules`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                name: 'drivers',
                module_type: 'user'
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          editModules2: ['addModules2', (results, cb) => {
            var module = _.first(results.addModules2.modules);
            request(server)
              .put(`/spaces/${results.addModules2._id}/modules/${module._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                'fields': {
                  'personalInfoFirstName': {
                    'notEmpty': true,
                    'errorMessage': 'personalInfoFirstName es requerido'
                  },
                  'personalInfoLastName': {
                    'notEmpty': true,
                    'errorMessage': 'personalInfoLastName es requerido'
                  },
                  'email': {
                    'notEmpty': true,
                    'isEmail': {
                      'errorMessage': 'isEmail es inválido'
                    },
                    'errorMessage': 'isEmail es requerido'
                  },
                  'password': {
                    'notEmpty': true,
                    'isLength': {
                      'options': [{
                        'min': 8
                      }],
                      'errorMessage': 'password debe contener al menos 8 caracteres'
                    },
                    'errorMessage': 'password es requerido'
                  }
                },
                'fields_type': {
                  'personalInfoFirstName': 'S',
                  'personalInfoLastName': 'S',
                  'email': 'S',
                  'password': 'S'
                },
                'keys': {
                  'email': 'UNIQUE'
                }
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          addModules3: ['createSpace', (results, cb) => {
            request(server)
              .post(`/spaces/${results.createSpace._id}/modules`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                name: 'cars',
                module_type: 'general'
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          editModules3: ['addModules3', (results, cb) => {
            var module = _.first(results.addModules3.modules);
            request(server)
              .put(`/spaces/${results.addModules3._id}/modules/${module._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                'fields': {
                  'owner': {
                    'notEmpty': true,
                    'errorMessage': 'plate es requerido',
                    'toObject': 'drivers'
                  },
                  'plate': {
                    'notEmpty': true,
                    'errorMessage': 'plate es requerido'
                  },
                  'model': {
                    'notEmpty': true,
                    'errorMessage': 'model es requerido'
                  }
                },
                'fields_type': {
                  'owner': 'T',
                  'plate': 'S',
                  'model': 'S'
                },
                'keys': {
                  'owner': 'INDEX',
                  'plate': 'UNIQUE'
                }
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          addModules4: ['createSpace', (results, cb) => {
            request(server)
              .post(`/spaces/${results.createSpace._id}/modules`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                name: 'trips',
                module_type: 'general'
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          editModules4: ['addModules4', (results, cb) => {
            var module = _.first(results.addModules4.modules);
            request(server)
              .put(`/spaces/${results.addModules4._id}/modules/${module._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                'fields': {
                  'id': {
                    'notEmpty': true,
                    'errorMessage': 'id es requerido'
                  },
                  'user_id': {
                    'notEmpty': true,
                    'errorMessage': 'user es requerido',
                    'toObject': 'users'
                  },
                  'address_start': {
                    'notEmpty': true,
                    'errorMessage': 'address_start es requerido',
                    'reverseLocation': 'loc_start'
                  },
                  'address_end': {
                    'notEmpty': true,
                    'errorMessage': 'address_start es requerido',
                    'reverseLocation': 'loc_end'
                  },
                  'location_start': {
                    'notEmpty': true,
                    'errorMessage': 'location_start es requerido',
                    'reverseAddress': 'address_start'
                  },
                  'location_end': {
                    'notEmpty': true,
                    'errorMessage': 'location_end es requerido',
                    'reverseAddress': 'address_end'
                  },
                  'status': {
                    'notEmpty': true,
                    'state': 'trips',
                    'default': 'created'
                  }
                },
                'fields_type': {
                  'id': 'R',
                  'user_id': 'T',
                  'address_start': 'S',
                  'address_end': 'S',
                  'location_start': 'L',
                  'location_end': 'L',
                  'status': 'M'
                },
                'keys': {
                  'id': 'UNIQUE',
                  'user': 'INDEX'
                }
              })
              //.expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          addModules5: ['createSpace', (results, cb) => {
            request(server)
              .post(`/spaces/${results.createSpace._id}/modules`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                name: 'tracks',
                module_type: 'gps'
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          editModules5: ['addModules5', (results, cb) => {
            var module = _.first(results.addModules5.modules);
            request(server)
              .put(`/spaces/${results.addModules5._id}/modules/${module._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                'fields': {
                  'driver_id': {
                    'notEmpty': true,
                    'errorMessage': 'driver_id es requerido',
                    'toObject': 'drivers'
                  },
                  'car_id': {
                    'notEmpty': true,
                    'errorMessage': 'car_id es requerido',
                    'toObject': 'cars'
                  },
                  'busy': {
                    'default': false
                  },
                  'location': {
                    'notEmpty': true,
                    'errorMessage': 'location es requerido'
                  },
                  'accuracy': {
                    'default': 10
                  },
                  'date': {
                    'notEmpty': true,
                    'errorMessage': 'date es requerido'
                  }

                },
                'fields_type': {
                  'driver_id': 'T',
                  'car_id': 'T',
                  'busy': 'B',
                  'location': 'L',
                  'accuracy': 'N',
                  'date': 'D'
                },
                'keys': {
                  'driver_id': 'INDEX',
                  'car_id': 'INDEX',
                  'date': 'INDEX',
                  'location': '2DSPHERE'
                }
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          addMachineState1: ['createSpace', (results, cb) => {
            request(server)
              .post(`/spaces/${results.createSpace._id}/states_machines`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                name: 'trips'
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }],
          editMachineState1: ['addMachineState1', (results, cb) => {
            var state_machine = _.first(results.addMachineState1.states_machines);
            request(server)
              .put(`/spaces/${results.addMachineState1._id}/states_machines/${state_machine._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `Token ${results.createAndLoginUser}`)
              .send({
                'states': [{
                  'name': 'created',
                  'next_state': ['picking', 'cancelled']
                }, {
                  'name': 'picking',
                  'next_state': ['cancelled', 'delivering', 'pickingUnattended', 'pickingAddressError']
                }, {
                  'name': 'cancelled',
                  'next_state': []
                }, {
                  'name': 'pickingUnattended',
                  'next_state': ['cancelled', 'picking']
                }, {
                  'name': 'pickingAddressError',
                  'next_state': ['cancelled', 'picking']
                }, {
                  'name': 'delivering',
                  'next_state': ['deliveringUnattended', 'deliveringAddressError', 'finishDelivering']
                }, {
                  'name': 'deliveringUnattended',
                  'next_state': ['delivering', 'returning']
                }, {
                  'name': 'deliveringAddressError',
                  'next_state': ['delivering', 'returning']
                }, {
                  'name': 'returning',
                  'next_state': ['returningUnattended', 'finishReturning']
                }, {
                  'name': 'returningUnattended',
                  'next_state': ['finishReturning']
                }, {
                  'name': 'finishDelivering',
                  'next_state': []
                }, {
                  'name': 'finishReturning',
                  'next_state': []
                }]
              })
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return cb(err);
                }
                cb(null, res.body);
              });
          }]

        },
        (err, results) => {
          if (err) {
            return done(err);
          }
          setTimeout(done, 0);
        });
    });
  });
});
