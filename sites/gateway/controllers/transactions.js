/* eslint-disable no-undef */
/* eslint-disable no-console */
'use strict';
var request = require('request');
var base = require(`${global.path}/models`);
var mongodb_modules = global.mongodb_modules;
var redis_util = require(`${global.path}/libs/redis_util`);
var util = require(`${global.path}/libs/util`);
var mongo_util = require(`${global.path}/libs/mongo_util`);
var listErrors = require(`${global.path}/libs/errors`);
var adapter = require(`${global.path}/libs/adapter`);
var types = require('mongoose').Types;
var moment = require('moment');
var config = require(`${global.path}/config`);


var _ = require('lodash');
var async = require('async');

//calibrar tipos de datos
function calibrate(obj, types) {
  _.forEach(types, (type, key) => {
    let names = key.replace(/[-+]/, '.');
    let val = _.get(obj, names);
    if (!_.isUndefined(val)) {
      if (type === 'A' && _.isArray(val)) {
        let keys = Object.keys(types).map(key => key.replace(/[-+]/, '.'));
        let keys2 = Object.keys(types);
        let tmp = [];
        _.forEach(val, v => {
          let tmp2 = {};
          _.forEach(v, (v2, k2) => {
            let i = keys.indexOf(`${names}.${k2}`);
            if (i !== -1) {
              _.set(tmp2, k2, util.parseTypes(types[keys2[i]], v2));
            }
          });
          tmp.push(tmp2);
        });
        _.set(obj, names, tmp);
      } else {
        _.set(obj, names, util.parseTypes(type, val));
      }
    }
  });
  return obj;
}

//errores
function rollbackPeding(results, cb) {
  if (!results.getInitial) {
    return cb();
  }
  let _id = results.getInitial._id;
  results.getInitial = null;
  base.Transaction.update({
    _id: _id,
    state: 'pending'
  }, {
      $set: {
        state: 'error',
        'source._id': _.get(results, 'updateSource.value._id'),
        'destination._id': _.get(results, 'updateDestination.value._id')
      }
    }).exec(cb);
}

//pasos
//3.1 si se actualiza, modifica la tabla, de source
function updateSource(results, cb) {
  if (!results.getInitial || !_.get(results, 'updateToPending.nModified')) {
    return cb();
  }
  let name_collection = `${results.getInitial.space._id}_${results.getInitial.space.name}_${results.getInitial.source.module}`;
  let collection = mongodb_modules.db.collection(name_collection.toLowerCase());
  results.getInitial.source.query = adapter.onlyQuery(results.getInitial.source.query, results.getInitial.source.fields_type);
  _.forEach(results.getInitial.source.update, (o, i) => {
    if (i === '$pull') {
      results.getInitial.source.update[i] = mongo_util.updateType(o);
    } else {
      results.getInitial.source.update[i] = calibrate(o, results.getInitial.source.fields_type);
    }
  });
  //agrega a transacciones pendientes
  _.set(results.getInitial.source, 'update.$addToSet.pendingTransactions', results.getInitial._id);
  _.set(results.getInitial.source, 'update.$set.updatedAt', moment().toDate());

  mongo_util.updateTransaction(collection, results.getInitial.source.query, results.getInitial.source.update, '_id', cb);
}
//3.2 si se actualiza, modifica la tabla, de destination (opcional)
function updateDestination(results, cb) {
  if (!results.getInitial || !_.get(results, 'updateToPending.nModified')) {
    return cb();
  }
  if (!_.get(results, 'getInitial.destination.module')) {
    return cb(null, {
      lastErrorObject: {
        updatedExisting: true,
        n: -1
      }
    });
  }
  let name_collection = `${results.getInitial.space._id}_${results.getInitial.space.name}_${results.getInitial.destination.module}`;
  let collection = mongodb_modules.db.collection(name_collection.toLowerCase());
  results.getInitial.destination.query = adapter.onlyQuery(results.getInitial.destination.query, results.getInitial.destination.fields_type);

  _.forEach(results.getInitial.destination.update, (o, i) => {
    if (i === '$pull') {
      results.getInitial.destination.update[i] = mongo_util.updateType(o);
    } else {
      results.getInitial.destination.update[i] = calibrate(o, results.getInitial.destination.fields_type);
    }
  });
  //agrega a transacciones pendientes
  _.set(results.getInitial.destination, 'update.$push.pendingTransactions', results.getInitial._id);
  _.set(results.getInitial.destination, 'update.$set.updatedAt', moment().toDate());

  mongo_util.updateTransaction(collection, results.getInitial.destination.query, results.getInitial.destination.update, '_id', cb);
}
//4. actualiza la transacción a aplicada
function updateToApplied(results, cb) {
  if (!results.updateSource) {
    return cb();
  }

  let us = _.get(results, 'updateSource.lastErrorObject.n');
  let ud = _.get(results, 'updateDestination.lastErrorObject.n');

  if (!results.getInitial || (us === 0 && ud === 0) || (us === 0 && ud === -1)) {
    return rollbackPeding(results, cb);
  }
  if (ud !== -1 && !_.get(results, 'updateDestination.value._id')) {
    return rollbackPeding(results, cb);
  }
  if (!_.get(results, 'updateSource.value._id') && ud === -1) {
    return rollbackPeding(results, cb);
  }

  //rollback source
  if (us === 1 && ud === 0) {
    let name_collection = `${results.getInitial.space._id}_${results.getInitial.space.name}_${results.getInitial.source.module}`;
    let collection = mongodb_modules.db.collection(name_collection.toLowerCase());

    _.set(results, 'getInitial.source.rollback.$pull.pendingTransactions', results.getInitial._id);

    return async.parallel({
      module: (cb) => {
        _.forEach(results.getInitial.source.rollback, (o, i) => {
          if (i === '$pull') {
            results.getInitial.source.rollback[i] = mongo_util.updateType(o);
          } else {
            results.getInitial.source.rollback[i] = calibrate(o, results.getInitial.source.fields_type);
          }
        });

        mongo_util.updateTransaction(collection, {
          _id: types.ObjectId(results.updateSource.value._id)
        }, results.getInitial.source.rollback, '_id', cb);
      },
      rb: (cb) => {
        return rollbackPeding(results, cb);
      }
    }, cb);
  }
  //rollback destination
  else if (us === 0 && ud === 1) {
    let name_collection = `${results.getInitial.space._id}_${results.getInitial.space.name}_${results.getInitial.destination.module}`;
    let collection = mongodb_modules.db.collection(name_collection.toLowerCase());

    _.set(results, 'getInitial.destination.rollback.$pull.pendingTransactions', results.getInitial._id);

    return async.parallel({
      module: (cb) => {

        _.forEach(results.getInitial.destination.rollback, (o, i) => {
          if (i === '$pull') {
            results.getInitial.destination.rollback[i] = mongo_util.updateType(o);
          } else {
            results.getInitial.destination.rollback[i] = calibrate(o, results.getInitial.destination.fields_type);
          }
        });

        mongo_util.updateTransaction(collection, {
          _id: types.ObjectId(results.updateDestination.value._id)
        }, results.getInitial.destination.rollback, '_id', cb);
      },
      rb: (cb) => {
        return rollbackPeding(results, cb);
      }
    }, cb);
  }



  base.Transaction.update({
    _id: results.getInitial._id,
    state: 'pending'
  }, {
      $set: {
        state: 'applied',
        'source._id': _.get(results, 'updateSource.value._id'),
        'destination._id': _.get(results, 'updateDestination.value._id')
      }
    }).exec(cb);

}
//5.1 remueve la transaccion pendiente del source
function removePendingTransactionsSource(results, cb) {
  if (!results.getInitial || !_.get(results, 'updateToApplied.nModified')) {
    return cb();
  }
  let name_collection = `${results.getInitial.space._id}_${results.getInitial.space.name}_${results.getInitial.source.module}`;
  let collection = mongodb_modules.db.collection(name_collection.toLowerCase());
  results.getInitial.source.query = adapter.onlyQuery(results.getInitial.source.query, results.getInitial.source.fields_type);

  mongo_util.updateTransaction(collection, {
    _id: results.getInitial.source._id || _.get(results, 'updateSource.value._id'),
    pendingTransactions: results.getInitial._id
  }, {
      $set: {
        updatedAt: moment().toDate()
      },
      $pull: {
        pendingTransactions: results.getInitial._id
      }
    }, '_id', cb);
}
//5.2 remueve la transaccion pendiente del destination
function removePendingTransactionsDestination(results, cb) {
  if (!results.getInitial || !_.get(results, 'updateToApplied.nModified')) {
    return cb();
  }
  if (!_.get(results, 'getInitial.destination.module')) {
    return cb(null, {
      lastErrorObject: {
        updatedExisting: true,
        n: 1
      }
    });
  }
  let name_collection = `${results.getInitial.space._id}_${results.getInitial.space.name}_${results.getInitial.destination.module}`;
  let collection = mongodb_modules.db.collection(name_collection.toLowerCase());
  results.getInitial.destination.query = adapter.onlyQuery(results.getInitial.destination.query, results.getInitial.destination.fields_type);

  mongo_util.updateTransaction(collection, {
    _id: results.getInitial.destination._id || _.get(results, 'updateDestination.value._id'),
    pendingTransactions: results.getInitial._id
  }, {
      $set: {
        updatedAt: moment().toDate()
      },
      $pull: {
        pendingTransactions: results.getInitial._id
      }
    }, '_id', cb);
}
//6. pasa la transacción a listo
function updateToDone(results, cb) {
  if (!results.getInitial || !_.get(results, 'removePendingTransactionsSource.lastErrorObject.n') || !_.get(results, 'removePendingTransactionsDestination.lastErrorObject.n')) {
    return cb();
  }
  base.Transaction.update({
    _id: results.getInitial._id,
    state: 'applied'
  }, {
      $set: {
        state: 'done'
      }
    }).exec(cb);
}
//7. Invoca el callback
function callback(results, cb) {
  if (!results.getInitial) {
    return cb();
  }

  if (_.get(results, 'updateToDone.nModified') && results.getInitial.callback) {
    request.get({
      url: results.getInitial.callback,
      json: true,
      body: {}
    }, (err, result, body) => {
      if (err) {
        return cb(err);
      }
      results.getInitial.callback_retry++;

      if (result.statusCode !== 200 && results.getInitial.callback_retry < result.callback_max_retry) {
        return callback(results, cb);
      }
      results.getInitial.callback_status = result.statusCode;
      results.getInitial.save(cb);
    });
  } else {
    cb();
  }
}

function transactionInitial(transaccion, cb = () => { }) {
  async.auto({
    //1. Busca una transacción 
    getInitial: (cb) => {
      let qs = {
        state: 'initial'
      };

      if (transaccion) {
        qs._id = transaccion._id;
      }
      base.Transaction.findOne(qs)
        .populate('space', 'name')
        .exec(cb);
    },
    //2. actualiza la transacción a pendiente
    updateToPending: ['getInitial', (results, cb) => {
      if (!results.getInitial) {
        return cb();
      }
      base.Transaction.update({
        _id: results.getInitial._id,
        state: 'initial'
      }, {
          $set: {
            state: 'pending'
          }
        }).exec(cb);
    }],
    //3.1 si se actualiza, modifica la tabla, de source
    updateSource: ['getInitial', 'updateToPending', updateSource],
    //3.2 si se actualiza, modifica la tabla, de destination (opcional)
    updateDestination: ['getInitial', 'updateToPending', updateDestination],
    //4. actualiza la transacción a aplicada
    updateToApplied: ['updateSource', 'updateDestination', updateToApplied],
    //5.1 remueve la transaccion pendiente del source
    removePendingTransactionsSource: ['updateToApplied', removePendingTransactionsSource],
    //5.2 remueve la transaccion pendiente del destination
    removePendingTransactionsDestination: ['updateToApplied', removePendingTransactionsDestination],
    //6. pasa la transacción a listo
    updateToDone: ['removePendingTransactionsSource', 'removePendingTransactionsDestination', updateToDone],
    //7. llama la url del callback
    callback: ['updateToDone', callback]
  },

    (err, results) => {
      //console.log('FIN Initial');
      if (err) {
        console.log(err);
      } else if (_.get(results, 'updateToDone.nModified')) {
        console.log('Transacción exitosa');
        transactionInitial();
      }
      cb();
    }
  );
}

function transactionPeding() {
  async.auto({
    //1. Busca una transacción 
    getInitial: (cb) => {
      base.Transaction.findOne({
        state: 'pending'
      })
        .populate('space', 'name')
        .exec(cb);
    },
    //2. actualiza la transacción a pendiente
    updateToPending: ['getInitial', (results, cb) => {
      if (!results.getInitial) {
        return cb();
      }
      cb(null, {
        nModified: 1
      });
    }],
    //3.1 si se actualiza, modifica la tabla, de source
    updateSource: ['getInitial', 'updateToPending', updateSource],
    //3.2 si se actualiza, modifica la tabla, de destination (opcional)
    updateDestination: ['getInitial', 'updateToPending', updateDestination],
    //4. actualiza la transacción a aplicada
    updateToApplied: ['updateSource', 'updateDestination', updateToApplied],
    //5.1 remueve la transaccion pendiente del source
    removePendingTransactionsSource: ['updateToApplied', removePendingTransactionsSource],
    //5.2 remueve la transaccion pendiente del destination
    removePendingTransactionsDestination: ['updateToApplied', removePendingTransactionsDestination],
    //6. pasa la transacción a listo
    updateToDone: ['removePendingTransactionsSource', 'removePendingTransactionsDestination', updateToDone],
    //7. llama la url del callback
    callback: ['updateToDone', callback]
  },

    (err, results) => {
      //console.log('FIN Peding');
      if (err) {
        console.log(err);
      } else if (_.get(results, 'updateToDone.nModified')) {
        console.log('Transacción exitosa');
        transactionPeding();
      }
    }
  );
}

function transactionApplied() {
  async.auto({
    //1. Busca una transacción 
    getInitial: (cb) => {
      base.Transaction.findOne({
        state: 'applied'
      })
        .populate('space', 'name')
        .exec(cb);
    },
    //4. actualiza la transacción a pendiente
    updateToApplied: ['getInitial', (results, cb) => {
      if (!results.getInitial) {
        return cb();
      }
      cb(null, {
        nModified: 1
      });
    }],
    //5.1 remueve la transaccion pendiente del source
    removePendingTransactionsSource: ['updateToApplied', removePendingTransactionsSource],
    //5.2 remueve la transaccion pendiente del destination
    removePendingTransactionsDestination: ['updateToApplied', removePendingTransactionsDestination],
    //6. pasa la transacción a listo
    updateToDone: ['removePendingTransactionsSource', 'removePendingTransactionsDestination', updateToDone],
    //7. llama la url del callback
    callback: ['updateToDone', callback]
  },

    (err, results) => {
      //console.log('FIN Applied');
      if (err) {
        console.log(err);
      } else if (_.get(results, 'updateToDone.nModified')) {
        console.log('Transacción exitosa');
        transactionApplied();
      }
    }
  );
}


module.exports = (req, res, next) => {
  let key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  let transaction = {
    state: 'initial',
    callback: req.body.callback
  };
  async.parallel({
    source: (cb) => {
      if (!_.get(req.body, 'source.module')) {
        return cb(listErrors(3001));
      }
      redis_util.getModule(req, key, req.params.componet, req.body.source.module, (err, _id, fields) => {
        if (err) {
          return cb(err);
        }
        if (fields.module_type === 'gps') {
          return cb(listErrors(3000));
        }
        transaction.source = {
          module: req.body.source.module,
          query: req.body.source.query,
          update: req.body.source.update,
          rollback: req.body.source.rollback,
          fields_type: fields.fields_type
        };
        transaction.space = _id;
        return cb();
      });
    },
    destination: (cb) => {
      if (!_.get(req.body, 'destination.module')) {
        return cb();
      }
      redis_util.getModule(req, key, req.params.componet, req.body.destination.module, (err, _id, fields) => {
        if (err) {
          return cb(err);
        }
        if (fields.module_type === 'gps') {
          return cb(listErrors(3000));
        }
        transaction.destination = {
          module: req.body.destination.module,
          query: req.body.destination.query,
          update: req.body.destination.update,
          rollback: req.body.destination.rollback,
          fields_type: fields.fields_type
        };
        return cb();
      });
    }
  }, (err, results) => {
    if (err && err.statusCode) {
      return res.status(err.statusCode).send(err);
    } else if (err) {
      return listErrors(500, res);
    }
    transaction = new base.Transaction(transaction);

    let errors = [];
    transaction.save((err) => {
      errors = [];
      if (err) {
        if (err.code === 11000) {
          let e = listErrors(2005);
          e.param = req.params.module;
          errors.push(e);
        } else {
          let e = listErrors(10000);
          e.param = req.params.module;
          errors.push(e);
        }
        return res.status(400).send(errors);
      }
      if (req.body.wait) {
        console.log('\nwait here', JSON.stringify(req.body));
        transactionInitial(transaction, () => {
          res.send({
            result: true
          });
        });
      } else {
        res.send({
          result: true
        });
        if (config.cron_enabled === 'yes') {
          transactionInitial(transaction);
        }
      }
    });
  });
};

function deleteDone() {
  base.Transaction.remove({
    state: {
      $in: ['done', 'error']
    }
  }, (err, res) => {
    if (err) {
      console.log('error', err);
    }
  });
}

function cron() {
  transactionApplied();
  transactionPeding();
  transactionInitial();
  deleteDone();
  setTimeout(function () {
    cron();
  }, 60000);
}

if (config.cron_enabled === 'yes') {
  cron();
}