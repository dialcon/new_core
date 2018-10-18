'use strict';
var _ = require('lodash');
var async = require('async');

var mongodb_modules = global.mongodb_modules;
var redis_util = require('../../../libs/redis_util');
var mongo_util = require('../../../libs/mongo_util');

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
  var key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  redis_util.getModule(req, key, req.params.componet, req.params.module, (err, _id, fields) => {
    if (err) {
      return res.status(400).send(err);
    }

    var name_collection = `${_id}_${req.params.componet}_${req.params.module}`;
    var collection = mongodb_modules.db.collection(name_collection.toLowerCase());
    var ret = req.query.return || '';

    delete req.query.apikey;
    delete req.query.token;

    if (fields.module_type === 'user') {
      ret += (ret ? ',' : '') + '-password';
    }

    //busca si se debe popular
    var populate = mongo_util.parsePopulate(req.query.populate, fields.fields);

    mongo_util.findById(collection, req.params.id, ret, (err, item) => {
      if (err) {
        return res.status(400).send({
          param: req.params.module,
          msg: req.__('Error %s: %s', err.code, err.errmsg),
          statusCode: 400
        });
      } else if (!item) {
        res.status(404).send({
          param: req.params.module,
          msg: req.__('No existe el documento'),
          statusCode: 404
        });
      } else {
        //busca los items que necesitan tranformación
        let pl = [];
        _.forEach(fields.fields_type, (i, k) => {
          if (i === 'PL') {
            pl.push(k.replace('-', '.'));
          }
        });
        let pp = [];
        _.forEach(fields.fields_type, (i, k) => {
          if (i === 'PP') {
            pp.push(k.replace('-', '.'));
          }
        });
        //convierte datos como los puntos
        _.forEach(pl, (i) => {
          mongo_util.changeIntoArraysPL(item, i);
        });
        _.forEach(pp, (i) => {
          mongo_util.changeIntoArraysPP(item, i);
        });

        //popula
        if (populate.length) {
          async.mapLimit(populate, 10, (model, cb) => {
            setPopulate(item, _id, req, model, cb);
          }, (err, results) => {
            if (err) {
              return res.status(401).send({
                param: req.params.module,
                msg: req.__('Error %s: %s', err.code, err.errmsg)
              });
            } else {
              res.send(item);
            }
          });
        } else {
          res.send(item);
        }
      }
    });
  });
};