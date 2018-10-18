'use strict';
var mongodb_modules = global.mongodb_modules;

var _ = require('lodash');
var async = require('async');

var redis_util = require(`${global.path}/libs/redis_util`);
var adapter = require(`${global.path}/libs/adapter`);
var mongo_util = require(`${global.path}/libs/mongo_util`);
var listErrors = require(`${global.path}/libs/errors`);

function setPopulate(item, _id, req, model, cb) {
  let name_collection = `${_id}_${req.params.componet}_${model.collection}`;
  let collection = mongodb_modules.db.collection(name_collection.toLowerCase());
  let value_var = model.field.replace(/[+-]/g, '.');

  //parte el nivel en array

  let levels = model.field.split('+', 2);
  if (levels.length === 1) {
    //popula objetos simples
    let value = _.get(item, value_var);
    if (_.isArray(value)) {
      async.mapLimit(value, 10, (_id, cb) => {
        mongo_util.findById(collection, _id, model.return, cb);
      }, (err, results) => {
        cb(err, _.set(item, value_var, results));
      });
    } else {
      mongo_util.findById(collection, value, model.return, (err, result) => {
        cb(err, _.set(item, value_var, result));
      });
    }

  } else {
    //popula arreglo de objetos
    let xvalue = _.get(item, levels[0]);
    if (_.isArray(xvalue)) {
      async.mapLimit(xvalue, 10, (value, cb) => {
        setPopulate(value, _id, req, {
          field: levels[1],
          return: model.return,
          collection: model.collection
        }, cb);
      }, cb);
    } else {
      let value = _.get(item, value_var);
      mongo_util.findById(collection, value, model.return, (err, result) => {
        cb(err, _.set(item, value_var, result));
      });
    }
  }
}

module.exports = (req, res, next) => {
  let key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  redis_util.getModule(req, key, req.params.componet, req.params.module, (err, _id, fields) => {
    if (err) {
      return res.status(400).send(err);
    }

    let name_collection = `${_id}_${req.params.componet}_${req.params.module}`;
    let collection = mongodb_modules.db.collection(name_collection.toLowerCase());
    let select = req.query.return || '';
    //busca si se debe popular
    let populate = mongo_util.parsePopulate(req.query.populate, fields.fields);

    //los elimina para que no sean tomados en cuenta al devolver datos
    delete req.query.apikey;
    delete req.query.token;
    delete req.query.return;
    delete req.query.populate;

    if (fields.module_type === 'user') {
      select += (select ? ',' : '') + '-password';
    }

    adapter.find(collection, req.query, fields.fields_type, select, function (err, result, pagination) {
      if (err) {
        let nerr = listErrors(10000);
        nerr.description = err;
        return res.status(nerr.statusCode).send(nerr);
      }
      //populale
      if (populate.length) {
        async.mapLimit(result, 10, (item, cb) => {
          async.mapLimit(populate, 10, (model, cb) => {
            setPopulate(item, _id, req, model, cb);
          }, cb);
        }, (err, results) => {
          res.send({
            result: result,
            pagination: pagination
          });
        });
      } else {
        res.send({
          result: result,
          pagination: pagination
        });
      }
    });
  });
};