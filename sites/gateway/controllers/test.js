'use strict';
var mongoose = global.mongodb_package;
var async = require('async');


exports.clean = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    async.waterfall([
      function(callback) {
        mongoose.collections.spaces.drop(function(err) {
          //console.log('Collection spaces as dropped');
          callback(err);
        });
      },
      function(callback) {
        mongoose.collections.users.drop(function(err) {
          //console.log('Collection users as dropped');
          callback(err);
        });
      }
    ], function(err, result) {
      if (err) {
        //console.log(err);
        return res.status(400).send(err);
      }
      res.send(result);
    });
  } else {
    res.status(400).send('No test mode');
  }
};
