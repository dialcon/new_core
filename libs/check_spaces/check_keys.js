'use strict';
var _ = require('lodash');
var validator = require('validator');
var regex = new RegExp(global._regex_type_of_indexes);

module.exports = function(fields, keys, cb) {
  var errors = [];
  var new_keys = {};
  keys.active = 'INDEX';
  keys.createdAt = 'INDEX';
  keys.updatedAt = 'INDEX';

  _.forEach(keys, (val, index) => {

    //console.log(index, fields[index]);
    if (validator.matches(index, /^[a-zA-Z0-9_.\-+]+$/) && fields[index]) {

      if (validator.matches(val, regex)) {
        //console.log('si', val);

        new_keys[index] = val;
      } else {
        //console.log('no', val);

        errors.push({
          'param': val,
          'msg': global.__('debe ser %s', global._regex_type_of_indexes)
        });
      }
    }
  });

  cb(errors.length ? errors : null, new_keys);
};
