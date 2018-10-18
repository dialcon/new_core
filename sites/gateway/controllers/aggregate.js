'use strict';

var mongodb_modules = global.mongodb_modules;
var redis_util = require('../../../libs/redis_util');
var mongo_util = require('../../../libs/mongo_util');

module.exports = (req, res, next) => {
  var key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  redis_util.getModule(req, key, req.params.componet, req.params.module, (err, _id, fields) => {
    if (err) {
      return res.status(400).send(err);
    }

    var name_collection = `${_id}_${req.params.componet}_${req.params.module}`;
    var collection = mongodb_modules.db.collection(name_collection.toLowerCase())

    mongo_util.aggregate(collection, req.body, (err, item) => {
      if (err) {
        return res.status(400).send({
          param: req.params.module,
          msg: req.__('Error %s: %s', err.code, err.errmsg),
          statusCode: 400
        });
      } else {
        return res.send(item);
      }
    });
  });
};