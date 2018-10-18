'use strict';
var redis_util = require(`${global.path}/libs/redis_util`);
var listErrors = require(`${global.path}/libs/errors`);

module.exports = (req, res, next) => {
  var key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;

  redis_util.getApiSecret(req, key, req.params.componet, (err, modules) => {
    if (err) {
      return res.status(401).send(err);
    }
    next();
  });
};
