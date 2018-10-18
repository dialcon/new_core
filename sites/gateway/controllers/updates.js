'use strict';
var mongoose = global.mongodb_modules;
var redis_util = require(`${global.path}/libs/redis_util`);
var util = require(`${global.path}/libs/util`);
var mongo_util = require(`${global.path}/libs/mongo_util`);
var _ = require('lodash');
var async = require('async');
var listErrors = require(`${global.path}/libs/errors`);
var moment = require('moment');
var bcrypt = require('bcrypt-nodejs');
var adapter = require(`${global.path}/libs/adapter`);

function setPopulate(item, _id, req, model, cb) {
  let name_collection = `${_id}_${req.params.componet}_${model.collection}`;
  let collection = mongoose.db.collection(name_collection.toLowerCase());
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

function selectChecked(fields, required) {

  let check = {};
  _.forEach(required, (item, key) => {

    if (_.isArray(item) && fields.fields_type[key] === 'A') {
      check[key] = [];
      _.forEach(item, (v, k) => {
        check[key][k] = selectChecked(fields, v);
      });
    } else {
      if (fields.fields[key]) {
        check[key] = fields.fields[key];
      }
    }
  });
  return check;
}

function selectExist(fields, body) {
  var required = util.check(body, fields.fields_type);
  var check = selectChecked(fields, required);
  return {
    required: required,
    check: check,
    body: {}
  };
}

module.exports = (req, res, next) => {
  var key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  redis_util.getModule(req, key, req.params.componet, req.params.module, (err, _id, fields) => {
    var ret = req.query.return || '';

    delete req.body.active;
    delete req.body.createdAt;
    delete req.body._id;

    if (fields.module_type === 'user') {
      ret += (ret ? ',' : '') + '-password,-password_temp';
      delete req.body.email;
    }

    //busca si se debe popular
    var populate = mongo_util.parsePopulate(req.query.populate, fields.fields);

    //creando fechas
    req.body.updatedAt = moment().toDate();

    var vput = selectExist(fields, req.body);

    function calibrate(check, obj, errors, fields_type, father) {
      
      let body = {};
      _.forEach(check, (item, key) => {
        if (_.isArray(item)) {
          body[key] = [];
          let error_father = [];
          let if_error = false;

          _.forEach(item, (v, k) => {
            let sub_errors = [];
            body[key].push(calibrate(v, obj[key][k], sub_errors, fields_type, key));
            error_father.push(sub_errors);
            if (sub_errors.length) {
              if_error = true;
            }
          });

          if (if_error) {
            errors.push({
              param: key,
              errors: error_father
            });
          }

        } else {
          if (key.indexOf('+') >= 0) {
            let nkey = key.split('+');
            if (nkey.length > 2) {
              let xxx = _.slice(key.split('+'), 2).join('+');
              let int_name = xxx.replace('-', '.').replace('+', '.');

              _.forEach(_.get(obj, nkey[1]), (v, k) => {
                let a = {};
                a[int_name] = item;
                _.set(body, `${nkey[1]}[${k}].${xxx}`, calibrate(a, v, [], fields_type, key.split('+', 2).join('+') + '+')[xxx]);
              });

            } else {
              let names = nkey[1].replace('-', '.').replace('+', '.');
              let val = _.get(obj, names);
              util.test(nkey, val, item, errors);
              if (fields_type[father] === 'A' && fields_type[`${father}+${names}`] === 'A') {} else if (fields_type[names] !== 'O') {
                body[names] = util.parseTypes(fields_type[key], val);
              }
            }

          } else {            
            let names = key.replace('-', '.').replace('+', '.');
            let val = _.get(obj, names);

            util.test(key, val, item, errors);
            if (fields_type[father + key] !== 'O') {
              body[names] = util.parseTypes(fields_type[father + key], val);
            }
          }
        }
      });
      return body;
    }
    //console.log('VPUT', JSON.stringify(vput.check));

    var errors = [];
    //console.log('vput.check', JSON.stringify(vput.check));
    vput.body = calibrate(vput.check, req.body, errors, fields.fields_type, '');
    //console.log('VPUT', vput.body, errors);

    //console.log('VPUT', JSON.stringify(vput.body), errors);

    if (errors.length) {
      return res.status(400).send(errors);
    }

    //console.log('VPUT', JSON.stringify(vput));


    function savePut() {
      let name_collection = `${_id}_${req.params.componet}_${req.params.module}`;
      let collection = mongoose.db.collection(name_collection.toLowerCase());
      let query = adapter.onlyQuery(req.query, fields.fields_type);

      mongo_util.updateQuery(collection, query, vput.body, req.query.return, (err, item) => {
        if (err) {
          //console.log(err);
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
        } else if (!item) {
          return res.status(404).send({
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
    }
    if (fields.module_type === 'user' && (vput.body.password || vput.body.password_temp)) {
      // let pass = vput.body.password ? 'vput.body.password' : 'vput.body.password_temp';
      bcrypt.genSalt(10, function (err, salt) {
        if (err) {
          return res.status(400).send(err);
        }
        if (vput.body.password) {
          bcrypt.hash(vput.body.password, salt, null, function (err, hash) {
            if (err) {
              return res.status(400).send(err);
            }
            vput.body.password = hash;
            savePut();
          });
        } else {
          bcrypt.hash(vput.body.password_temp, salt, null, function (err, hash) {
            if (err) {
              return res.status(400).send(err);
            }
            vput.body.password_temp = hash;
            savePut();
          });
        }
      });
    } else {
      savePut();
    }

  });
};