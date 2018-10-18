'use strict';
var request = require('request');
var base = require(`${global.path}/models`);
var mongodb_modules = global.mongodb_modules;
var redis_util = require(`${global.path}/libs/redis_util`);
var util = require(`${global.path}/libs/util`);
var mongo_util = require(`${global.path}/libs/mongo_util`);
var listErrors = require(`${global.path}/libs/errors`);
var adapter = require(`${global.path}/libs/adapter`);


var _ = require('lodash');
var async = require('async');

//calibrar datos
function calibrate(obj, types) {
  let body = {};
  _.forEach(types, (type, key) => {
    let names = key.replace(/[-+]/, '.');
    let val = _.get(obj, names);
    if (!_.isUndefined(val)) {
      _.set(obj, names, util.parseTypes(type, val));
    }
  });
  return body;
}

//pasos
//3 si se actualiza, modifica la tabla, de source
function updateSource(results, cb) {
  if (!results.getInitial || !_.get(results, 'updateToPending.nModified')) {
    return cb();
  }
  request({
    url: results.getInitial.action.url,
    json: true,
    body: results.getInitial.action.body,
    qs: results.getInitial.action.qs,
    method: results.getInitial.action.method
  }, (err, result, body) => {
    if (err || result.statusCode !== 200) {
      return cb(err || body);
    }
    let name_collection = `${results.getInitial.space._id}_${results.getInitial.space.name}_${results.getInitial.source.module}`;
    let collection = mongodb_modules.db.collection(name_collection.toLowerCase());
    results.getInitial.source.query = adapter.onlyQuery(results.getInitial.source.query, results.getInitial.source.fields_type);
    _.forEach(body, (o) => {
      o = calibrate(o, results.getInitial.source.fields_type);
    });
    //agrega a transacciones pendientes
    _.set(results.getInitial.source, 'value.push.pendingActions', results.getInitial._id);

    mongo_util.updateAction(collection, results.getInitial.source.query, body, '_id', cb);
  });


}
//4. actualiza la acción a aplicada
function updateToApplied(results, cb) {
  if (!results.getInitial || !_.get(results, 'updateSource.lastErrorObject.n')) {
    return cb();
  }

  base.Action.update({
    _id: results.getInitial._id,
    state: 'pending'
  }, {
    $set: {
      state: 'applied',
      'source._id': _.get(results, 'updateSource.value._id')
    }
  }).exec(cb);
}
//5 remueve la acción pendiente del source
function removePendingActionsSource(results, cb) {
  if (!results.getInitial || !_.get(results, 'updateToApplied.nModified')) {
    return cb();
  }
  let name_collection = `${results.getInitial.space._id}_${results.getInitial.space.name}_${results.getInitial.source.module}`;
  let collection = mongodb_modules.db.collection(name_collection.toLowerCase());
  results.getInitial.source.query = adapter.onlyQuery(results.getInitial.source.query, results.getInitial.source.fields_type);

  mongo_util.updateAction(collection, {
    _id: results.getInitial.source._id || _.get(results, 'updateSource.value._id'),
    pendingActions: results.getInitial._id
  }, {
    pull: {
      pendingActions: results.getInitial._id
    }
  }, '_id', cb);
}
//6. pasa la acción a listo
function updateToDone(results, cb) {
  if (!results.getInitial || !_.get(results, 'removePendingActionsSource.lastErrorObject.n')) {
    return cb();
  }
  base.Action.update({
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
  if (_.get(results, 'updateToDone.nModified')) {
    request.put({
      url: results.getInitial.callback,
      json: true,
      body: {}
    }, (err, result, body) => {
      if (err) {
        return cb(err);
      }
      results.getInitial.callback_status = result.statusCode;
      results.getInitial.save(cb);
    });
  } else {
    cb();
  }
}

function actionInitial() {
  async.auto({
      //1. Busca una acción 
      getInitial: (cb) => {
        base.Action.findOne({
            state: 'initial'
          })
          .populate('space', 'name')
          .exec(cb);
      },
      //2. actualiza la acción a pendiente
      updateToPending: ['getInitial', (results, cb) => {
        if (!results.getInitial) {
          return cb();
        }
        base.Action.update({
          _id: results.getInitial._id,
          state: 'initial'
        }, {
          $set: {
            state: 'pending'
          }
        }).exec(cb);
      }],
      //3 si se actualiza, modifica la tabla, de source
      updateSource: ['getInitial', 'updateToPending', updateSource],
      //4. actualiza la acción a aplicada
      updateToApplied: ['updateSource', updateToApplied],
      //5 remueve la transaccion pendiente del source
      removePendingActionsSource: ['updateToApplied', removePendingActionsSource],
      //6. pasa la acción a listo
      updateToDone: ['removePendingActionsSource', updateToDone],
      //7. llama la url del callback
      callback: ['updateToDone', callback]
    },

    (err, results) => {
      console.log('FIN Initial');
      if (err) {
        console.log(err);
      } else if (_.get(results, 'updateToDone.nModified')) {
        console.log('Transacción exitosa');
        actionInitial();
      }
    }
  );
}

function actionPeding() {
  async.auto({
      //1. Busca una acción 
      getInitial: (cb) => {
        base.Action.findOne({
            state: 'pending'
          })
          .populate('space', 'name')
          .exec(cb);
      },
      //2. actualiza la acción a pendiente
      updateToPending: ['getInitial', (results, cb) => {
        if (!results.getInitial) {
          return cb();
        }
        cb(null, {
          nModified: 1
        });
      }],
      //3 si se actualiza, busca la url
      updateSource: ['getInitial', 'updateToPending', updateSource],
      //4. actualiza la acción a aplicada
      updateToApplied: ['updateSource', updateToApplied],
      //5.1 remueve la transaccion pendiente del source
      removePendingActionsSource: ['updateToApplied', removePendingActionsSource],
      //6. pasa la acción a listo
      updateToDone: ['removePendingActionsSource', updateToDone],
      //7. llama la url del callback
      callback: ['updateToDone', callback]
    },

    (err, results) => {
      console.log('FIN Peding');
      if (err) {
        console.log(err);
      } else if (_.get(results, 'updateToDone.nModified')) {
        console.log('Transacción exitosa');
        actionPeding();
      }
    }
  );
}

function actionApplied() {
  async.auto({
      //1. Busca una acción 
      getInitial: (cb) => {
        base.Action.findOne({
            state: 'applied'
          })
          .populate('space', 'name')
          .exec(cb);
      },
      //4. actualiza la acción a pendiente
      updateToApplied: ['getInitial', (results, cb) => {
        if (!results.getInitial) {
          return cb();
        }
        cb(null, {
          nModified: 1
        });
      }],
      //5.1 remueve la transaccion pendiente del source
      removePendingActionsSource: ['updateToApplied', removePendingActionsSource],
      //6. pasa la acción a listo
      updateToDone: ['removePendingActionsSource', updateToDone],
      //7. llama la url del callback
      callback: ['updateToDone', callback]
    },

    (err, results) => {
      console.log('FIN Applied');
      if (err) {
        console.log(err);
      } else if (_.get(results, 'updateToDone.nModified')) {
        console.log('Transacción exitosa');
        actionApplied();
      }
    }
  );
}


module.exports = (req, res, next) => {
  let key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  let action = {
    state: 'initial',
    action: req.body.action,
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
        action.source = {
          module: req.body.source.module,
          query: req.body.source.query,
          value: req.body.source.value,
          fields_type: fields.fields_type
        };
        action.space = _id;
        return cb();
      });
    }
  }, (err, results) => {
    if (err && err.statusCode) {
      return res.status(err.statusCode).send(err);
    } else if (err) {
      return listErrors(500, res);
    }
    action = new base.Action(action);

    let errors = [];
    action.save((err) => {
      errors = [];
      if (err) {
        console.log(err);
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

      res.send({
        result: true
      });
      actionInitial();
    });
  });
};

actionApplied();
actionPeding();
actionInitial();