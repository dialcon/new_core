'use strict';
var mongodb_modules = global.mongodb_modules;
var redis_util = require(`${global.path}/libs/redis_util`);
var mongo_util = require(`${global.path}/libs/mongo_util`);
var util = require(`${global.path}/libs/util`);
var _ = require('lodash');
var moment = require('moment');
var bcrypt = require('bcrypt-nodejs');
var listErrors = require(`${global.path}/libs/errors`);
var validator = require('validator');


module.exports = (req, res, next) => {
  let key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  redis_util.getModule(req, key, req.params.componet, req.params.module, (err, _id, fields) => {
    if (err) {
      return res.status(400).send(err);
    }
    //console.log(req.body, fields.fields);
    req.body.active = true;
    //creando fechas
    req.body.updatedAt = req.body.createdAt = moment().toDate();
    //testBody(fields.fields);
    let vput = {
      body: {}
    };

    let calibrate = null;
    let calibrateArray = function (names, fields, obj, errors) {
      let body = [];
      let if_error = false;
      //tipos a tratar
      let xfields = {};
      let xfields_type = {};
      _.forEach(fields.fields, (item, key) => {
        if (key.indexOf(`${names}+`) >= 0) {
          let nkey = key.split('+');
          xfields[nkey[1]] = item;
        }
      });
      _.forEach(fields.fields_type, (item, key) => {
        if (key.indexOf(`${names}+`) >= 0) {
          let nkey = key.split('+');
          xfields_type[nkey[1]] = item;
        }
      });
      let error_father = [];

      _.forEach(obj[names], (obj_item) => {
        let sub_errors = [];
        body.push(calibrate({
          fields: xfields,
          fields_type: xfields_type
        }, obj_item, sub_errors));
        error_father.push(sub_errors);
        if (sub_errors.length) {
          if_error = true;
        }
      });

      if (if_error) {
        errors.push({
          param: names,
          errors: error_father
        });
      }
      return body;
    };

    calibrate = function (fields, obj, errors) {
      let body = {};
      _.forEach(fields.fields, (item, key) => {
        if (key.indexOf('+') >= 0) {

        } else {
          let names = key.replace('-', '.').replace('+', '.');
          let val = _.get(obj, names);
          //console.log(`key ${key} val ${val} ==> ${JSON.stringify(item)}`);
          //console.log(`fields ${JSON.stringify(fields.fields[key])}`);
          if (['O', 'A'].indexOf(fields.fields_type[names]) === -1) {
            body[names] = util.parseTypes(fields.fields_type[key], val, true);

            if ((_.isUndefined(body[names]) || _.isNull(body[names])) && !_.isUndefined(fields.fields[key].default)) {
              body[names] = fields.fields[key].default;
            }

            util.test(key, body[names], item, errors);
          } else if (fields.fields_type[names] === 'A') {
            body[names] = calibrateArray(names, fields, obj, errors);
          }


        }
      });
      return body;
    };

    let errors = [];
    vput.body = calibrate(fields, req.body, errors);

    //console.log(vput.body);
    if (errors.length) {
      //console.log(errors);
      return res.status(400).send(errors);
    }

    function savePost() {
      //busqueda en la db, y guardado
      let name_collection = `${_id}_${req.params.componet}_${req.params.module}`;
      let collection = mongodb_modules.db.collection(name_collection.toLowerCase());
      mongo_util.insert(collection, vput.body, function (err, result) {
        errors = [];
        //console.log(err, result);
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
        }

        res.send({
          result: result
        });
      });
    }
    if (fields.module_type === 'user') {
      bcrypt.genSalt(10, function (err, salt) {
        if (err) {
          return res.status(500).send(err);
        }
        bcrypt.hash(req.body.password, salt, null, function (err, hash) {
          if (err) {
            return res.status(500).send(err);
          }
          vput.body.password = hash;
          vput.body.email = validator.normalizeEmail(vput.body.email, {
            remove_dots: true,
            all_lowercase: true
          });

          savePost();
        });
      });
    } else {
      savePost();
    }


  });
};