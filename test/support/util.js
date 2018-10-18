var request = require('supertest');
var moment = require('moment');
var mongoose = require('mongoose');
var async = require('async');
var _ = require('lodash');

var createUser = exports.createUser = (cb) => {
  global.mongodb_package.collections.users.insertOne({
    'updatedAt': moment().toISOString(),
    'createdAt': moment().toISOString(),
    'name': 'test',
    'email': 'test@test.com',
    'password': '$2a$10$/oPpGrxM3GVUapcHXY2b3.Rdi4dCHhogotqAAEZ5d.N5/twq2kX3m'
  }, (err, doc) => {
    cb(err, _.first(doc.ops));
  });
};


var createSpace = (user_id, cb) => {
  global.mongodb_package.collections.spaces.insertOne({
    'updatedAt': moment().toISOString(),
    'createdAt': moment().toISOString(),
    'user': mongoose.Types.ObjectId(user_id),
    'name': 'encomiendas',
    'active': true,
    'states_machines': [{
      'name': 'trips',
      '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b6b'),
      'states': [{
        'name': 'created',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b79'),
        'next_state': [
          'picking',
          'cancelled'
        ]
      }, {
        'name': 'picking',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b78'),
        'next_state': [
          'cancelled',
          'delivering',
          'pickingUnattended',
          'pickingAddressError'
        ]
      }, {
        'name': 'cancelled',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b77'),
        'next_state': []
      }, {
        'name': 'pickingUnattended',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b76'),
        'next_state': [
          'cancelled',
          'picking'
        ]
      }, {
        'name': 'pickingAddressError',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b75'),
        'next_state': [
          'cancelled',
          'picking'
        ]
      }, {
        'name': 'delivering',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b74'),
        'next_state': [
          'deliveringUnattended',
          'deliveringAddressError',
          'finishDelivering'
        ]
      }, {
        'name': 'deliveringUnattended',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b73'),
        'next_state': [
          'delivering',
          'returning'
        ]
      }, {
        'name': 'deliveringAddressError',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b72'),
        'next_state': [
          'delivering',
          'returning'
        ]
      }, {
        'name': 'returning',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b71'),
        'next_state': [
          'returningUnattended',
          'finishReturning'
        ]
      }, {
        'name': 'returningUnattended',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b70'),
        'next_state': [
          'finishReturning'
        ]
      }, {
        'name': 'finishDelivering',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b6f'),
        'next_state': []
      }, {
        'name': 'finishReturning',
        '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b6e'),
        'next_state': []
      }]
    }],
    'modules': [{
      'name': 'drivers',
      'module_type': 'user',
      '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b69'),
      'active': true,
      'new': true,
      'fields': {
        'updatedAt': {
          'isDate': {
            'errorMessage': 'updatedAt es inválido'
          }
        },
        'createdAt': {
          'isDate': {
            'errorMessage': 'createdAt es inválido'
          }
        },
        'active': {
          'isBoolean': {
            'errorMessage': 'active es inválido'
          }
        },
        'password': {
          'errorMessage': 'password es requerido',
          'isLength': {
            'errorMessage': 'password debe contener al menos 8 caracteres',
            'options': [{
              'min': 8
            }]
          },
          'notEmpty': true
        },
        'email': {
          'errorMessage': 'isEmail es requerido',
          'isEmail': {
            'errorMessage': 'isEmail es inválido'
          },
          'notEmpty': true
        },
        'personalInfo-lastname': {
          'errorMessage': 'personalInfoLastName es requerido',
          'notEmpty': true
        },
        'personalInfo-firstname': {
          'errorMessage': 'personalInfoFirstName es requerido',
          'notEmpty': true
        },
        'personalInfo': {
          'toObject': true
        }
      },
      'fields_type': {
        'updatedAt': 'D',
        'createdAt': 'D',
        'active': 'B',
        'password': 'S',
        'email': 'S',
        'personalInfoLastName': 'S',
        'personalInfoFirstName': 'S'
      },
      'keys': {
        'updatedAt': 'INDEX',
        'createdAt': 'INDEX',
        'active': 'INDEX',
        'email': 'UNIQUE'
      }
    }, {
      'name': 'tracks',
      'module_type': 'gps',
      '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b68'),
      'active': true,
      'new': true,
      'fields': {
        'updatedAt': {
          'isDate': {
            'errorMessage': 'updatedAt es inválido'
          }
        },
        'createdAt': {
          'isDate': {
            'errorMessage': 'createdAt es inválido'
          }
        },
        'active': {
          'isBoolean': {
            'errorMessage': 'active es inválido'
          }
        },
        'date': {
          'errorMessage': 'date es requerido',
          'notEmpty': true
        },
        'accuracy': {
          'default': 10
        },
        'location': {
          'errorMessage': 'location es requerido',
          'notEmpty': true
        },
        'busy': {
          'default': false
        },
        'car_id': {
          'toObject': 'cars',
          'errorMessage': 'car_id es requerido',
          'notEmpty': true
        },
        'driver_id': {
          'toObject': 'drivers',
          'errorMessage': 'driver_id es requerido',
          'notEmpty': true
        }
      },
      'fields_type': {
        'updatedAt': 'D',
        'createdAt': 'D',
        'active': 'B',
        'date': 'D',
        'accuracy': 'N',
        'location': 'L',
        'busy': 'B',
        'car_id': 'T',
        'driver_id': 'T'
      },
      'keys': {
        'updatedAt': 'INDEX',
        'createdAt': 'INDEX',
        'active': 'INDEX',
        'date': 'INDEX',
        'car_id': 'INDEX',
        'driver_id': 'INDEX',
        'location': '2DSPHERE'
      }
    }, {
      'name': 'users',
      'module_type': 'user',
      '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b6a'),
      'active': true,
      'new': true,
      'fields': {
        'updatedAt': {
          'isDate': {
            'errorMessage': 'updatedAt es inválido'
          }
        },
        'createdAt': {
          'isDate': {
            'errorMessage': 'createdAt es inválido'
          }
        },
        'active': {
          'isBoolean': {
            'errorMessage': 'active es inválido'
          }
        },
        'password': {
          'errorMessage': 'password es requerido',
          'isLength': {
            'errorMessage': 'password debe contener al menos 8 caracteres',
            'options': [{
              'min': 8
            }]
          },
          'notEmpty': true
        },
        'email': {
          'errorMessage': 'isEmail es requerido',
          'isEmail': {
            'errorMessage': 'isEmail es inválido'
          },
          'notEmpty': true
        },
        'personalInfoLastName': {
          'errorMessage': 'personalInfoLastName es requerido',
          'notEmpty': true
        },
        'personalInfoFirstName': {
          'errorMessage': 'personalInfoFirstName es requerido',
          'notEmpty': true
        }
      },
      'fields_type': {
        'updatedAt': 'D',
        'createdAt': 'D',
        'active': 'B',
        'password': 'S',
        'email': 'S',
        'personalInfoLastName': 'S',
        'personalInfoFirstName': 'S'
      },
      'keys': {
        'updatedAt': 'INDEX',
        'createdAt': 'INDEX',
        'active': 'INDEX',
        'email': 'UNIQUE'
      }
    }, {
      'name': 'trips',
      'module_type': 'general',
      '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b6c'),
      'active': true,
      'new': true,
      'fields': {
        'updatedAt': {
          'isDate': {
            'errorMessage': 'updatedAt es inválido'
          }
        },
        'createdAt': {
          'isDate': {
            'errorMessage': 'createdAt es inválido'
          }
        },
        'active': {
          'isBoolean': {
            'errorMessage': 'active es inválido'
          }
        },
        'status_history': true,
        'status': {
          'default': 'created',
          'state': 'trips',
          'notEmpty': true
        },
        'location_end': {
          'reverseAddress': 'address_end',
          'errorMessage': 'location_end es requerido',
          'notEmpty': true
        },
        'location_start': {
          'reverseAddress': 'address_start',
          'errorMessage': 'location_start es requerido',
          'notEmpty': true
        },
        'address_end': {
          'reverseLocation': 'location_end',
          'errorMessage': 'address_start es requerido',
          'notEmpty': true
        },
        'address_start': {
          'reverseLocation': 'location_start',
          'errorMessage': 'address_start es requerido',
          'notEmpty': true
        },
        'user_id': {
          'toObject': 'users',
          'errorMessage': 'user es requerido',
          'notEmpty': true
        },
        'id': {
          'errorMessage': 'id es requerido',
          'notEmpty': true
        }
      },
      'fields_type': {
        'updatedAt': 'D',
        'createdAt': 'D',
        'active': 'B',
        'status_history': 'A',
        'status': 'M',
        'location_end': 'L',
        'location_start': 'L',
        'address_end': 'S',
        'address_start': 'S',
        'user_id': 'T',
        'id': 'R'
      },
      'keys': {
        'updatedAt': 'INDEX',
        'createdAt': 'INDEX',
        'active': 'INDEX',
        'id': 'UNIQUE'
      }
    }, {
      'name': 'cars',
      'module_type': 'general',
      '_id': mongoose.Types.ObjectId('581a416c33f8cb6225198b6d'),
      'active': true,
      'new': true,
      'fields': {
        'updatedAt': {
          'isDate': {
            'errorMessage': 'updatedAt es inválido'
          }
        },
        'createdAt': {
          'isDate': {
            'errorMessage': 'createdAt es inválido'
          }
        },
        'active': {
          'isBoolean': {
            'errorMessage': 'active es inválido'
          }
        },
        'model': {
          'errorMessage': 'model es requerido',
          'notEmpty': true
        },
        'plate': {
          'errorMessage': 'plate es requerido',
          'notEmpty': true
        },
        'owner': {
          'toObject': 'drivers',
          'errorMessage': 'plate es requerido',
          'notEmpty': true
        }
      },
      'fields_type': {
        'updatedAt': 'D',
        'createdAt': 'D',
        'active': 'B',
        'model': 'S',
        'plate': 'S',
        'owner': 'T'
      },
      'keys': {
        'updatedAt': 'INDEX',
        'createdAt': 'INDEX',
        'active': 'INDEX',
        'plate': 'UNIQUE',
        'owner': 'INDEX'
      }
    }],


  }, (err, doc) => {
    cb(err, _.first(doc.ops));
  });
};

exports.createAndLoginUser = (server, cb) => {
  async.auto({
    user: (cb) => {
      createUser(cb);
    },
    login: ['user', (results, cb) => {
      request(server)
        .post('/login')
        .set('Accept', 'application/json')
        .send({
          email: 'test@test.com',
          password: '123456'
        })
        .expect(200)
        .end(cb);
    }]
  }, (err, results) => {
    if (err) {
      return cb(err);
    }
    cb(null, results.login.body.token);
  });
};

exports.createSpaceWithUser = (cb) => {
  async.auto({
    user: (cb) => {
      createUser(cb);
    },
    space: ['user', (results, cb) => {
      createSpace(results.user._id, cb);
    }]
  }, (err, results) => {
    if (err) {
      return cb(err);
    }
    cb(null, results);
  });
};

exports.createSpaceWithUserAndLogin = (server, cb) => {
  async.auto({
    user: (cb) => {
      createUser(cb);
    },
    space: ['user', (results, cb) => {
      createSpace(results.user._id, cb);
    }],
    login: ['user', (results, cb) => {
      request(server)
        .post('/login')
        .set('Accept', 'application/json')
        .send({
          email: 'test@test.com',
          password: '123456'
        })
        .expect(200)
        .end((err, results) => {
          if (err) {
            return cb(err);
          }
          cb(null, results.body.token);
        });
    }]
  }, (err, results) => {
    if (err) {
      return cb(err);
    }
    cb(null, results);
  });
};


exports.createAll = (server, cb) => {
  async.auto({
    user: (cb) => {
      createUser(cb);
    },
    space: ['user', (results, cb) => {
      createSpace(results.user._id, cb);
    }],
    login: ['user', (results, cb) => {
      request(server)
        .post('/login')
        .set('Accept', 'application/json')
        .send({
          email: 'test@test.com',
          password: '123456'
        })
        .expect(200)
        .end((err, results) => {
          if (err) {
            return cb(err);
          }
          cb(null, results.body.token);
        });
    }],
    apikey: ['user', 'space', (results, cb) => {
      createApiKey(results.user._id, results.space._id, cb);
    }]
  }, (err, results) => {
    if (err) {
      return cb(err);
    }
    cb(null, results);
  });
};
