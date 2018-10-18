'use strict';
var mongoose = global.mongodb_modules;
var redis_util = require(`${global.path}/libs/redis_util`);
var mongo_util = require(`${global.path}/libs/mongo_util`);
var listErrors = require(`${global.path}/libs/errors`);


module.exports = (req, res, next) => {
  var key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  redis_util.getModule(req, key, req.params.componet, req.params.module, (err, _id, fields) => {
    var name_collection = `${_id}_${req.params.componet}_${req.params.module}`;
    var collection = mongoose.db.collection(name_collection.toLowerCase());

    mongo_util.pullById(collection, req.params.id, req.params.field_id, req.params.field, req.query.return, (err, docs) => {
      let error;
      if (err) {
        error = listErrors(10000);
        error.param = req.params.module;
        error.description = err;
        return res.status(error.statusCode).send(error);
      } else if (!docs) {
        error = listErrors(2004);
        error.param = req.params.module;
        return res.status(error.statusCode).send(error);
      } else {
        res.send(docs);
      }
    });

  });
};
