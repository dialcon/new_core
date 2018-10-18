'use strict';
var mongoose = global.mongodb_modules;
var redis_util = require('../../../libs/redis_util');
var mongo_util = require('../../../libs/mongo_util');

module.exports = (req, res, next) => {
  var key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  redis_util.getModule(req, key, req.params.componet, req.params.module, (err, _id, fields) => {

    var name_collection = `${_id}_${req.params.componet}_${req.params.module}`;
    var collection = mongoose.db.collection(name_collection.toLowerCase());

    mongo_util.updateById(collection, req.params.id, {
      active: true
    }, req.query.return, (err, docs) => {
      if (err) {
        return res.status(400).send({
          param: req.params.module,
          msg: req.__('Error %s: %s', err.code, err.errmsg),
          statusCode: 400
        });
      } else if (!docs) {
        return res.status(404).send({
          param: req.params.module,
          msg: req.__('No existe el documento'),
          statusCode: 404
        });
      } else {
        res.send(docs);
      }
    });

  });
};
