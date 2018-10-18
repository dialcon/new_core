'use strict';
var redis = global.clientRedis;

var async = require('async');

var config = require(`${global.path}/config`);
var base = require(`${global.path}/models`);
var listErrors = require(`${global.path}/libs/errors`);

var getApiSecret = exports.getApiSecret = function(req, key, name_space, cb) {
  redis.get(`${key}_space_${name_space}`, function(err, reply) {
    if (err) {
      return cb(err);
    } else if (config.cache && reply) {
      //console.log('cache');
      return cb(null, JSON.parse(reply));
    } else {
      async.waterfall([
        (cb) => {
          base.ApiKey.findOne({
              keys: {
                $elemMatch: {
                  key: key,
                  active: true
                }
              }
            }, 'space name keys.$')
            .exec(function(err, apikey) {
              if (err) {
                return cb(err);
              } else if (!apikey) {
                return cb(listErrors(2001));
              }
              cb(null, apikey);
            });
        }, (apikey, cb) => {
          base.Space.findOne({
              _id: apikey.space,
              name: name_space
            }, '_id')
            .exec(function(err, space) {
              if (err) {
                return cb(err);
              } else if (!space) {
                return cb(listErrors(2002));
              }
              cb(null, apikey);
            });
        }
      ], (err, apikey) => {
        if (err) {
          return cb(err);
        }

        redis.set(`${key}_space_${name_space}`, JSON.stringify(apikey.keys[0]), function(err, reply) {
          if (err) {
            return cb(err);
          }
          //console.log('create');
          return cb(null, apikey.keys[0]);
        });

      });
    }
  });
};

exports.getModule = function(req, key, name_space, name_module, cb) {
  async.parallel({
    key: (cb) => {
      getApiSecret(req, key, name_space, cb);
    }
  }, (err, results) => {
    if (err) {
      return cb(err);
    }

    base.Space.findOne({
        name: name_space,
        modules: {
          $elemMatch: {
            name: name_module
          }
        }
      }, 'modules.$')
      .lean()
      .exec(function(err, space) {
        if (err) {
          return cb(err);
        } else if (!space) {
          return cb(listErrors(2000));
        }
        //intercambia los nombres de - a .
        cb(null, space._id, space.modules[0]);
      });
  });
};
