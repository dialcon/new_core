'use strict';
var mongodb_modules = global.mongodb_modules;

var _ = require('lodash');

var redis_util = require(`${global.path}/libs/redis_util`);
var adapter = require(`${global.path}/libs/adapter`);
var listErrors = require(`${global.path}/libs/errors`);

module.exports = (req, res, next) => {
  let key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  redis_util.getModule(req, key, req.params.componet, req.params.module, (err, _id, fields) => {
    if (err) {
      return res.status(400).send(err);
    }

    let name_collection = `${_id}_${req.params.componet}_${req.params.module}`;
    let collection = mongodb_modules.db.collection(name_collection.toLowerCase());
    let select = req.query.return || '';

    //los elimina para que no sean tomados en cuenta al devolver datos
    delete req.query.apikey;
    delete req.query.token;
    delete req.query.return;
    delete req.query.populate;

    if (fields.module_type === 'user') {
      select += (select ? ',' : '') + '-password';
    }

    adapter.count(collection, req.query, fields.fields_type, function (err, count) {
      if (err) {
        let nerr = listErrors(10000);
        nerr.description = err;
        return res.status(nerr.statusCode).send(nerr);
      }
      //populale
      res.send({
        result: count
      });
    });
  });
};