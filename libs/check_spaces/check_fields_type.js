'use strict';
var _ = require('lodash');
var validator = require('validator');
var listErrors = require(`${global.path}/libs/errors`);

var regex = new RegExp(global._regex_type_of_fields);

module.exports = function(fields, fields_type, cb) {
  var errors = [];
  var new_fields_type = {};
  fields_type.active = 'B';
  fields_type.createdAt = 'D';
  fields_type.updatedAt = 'D';


  _.forEach(fields, (val, index) => {
    if (val.array) {
      fields_type[index] = 'A';
    } else if (val.object) {
      fields_type[index] = 'O';
    } else if (val.arrayNormal) {
      fields_type[index] = 'AN';
    } else if (val.objectNormal) {
      fields_type[index] = 'ON';
    }
    if (fields_type[index]) {
      if (validator.matches(fields_type[index], regex)) {
        new_fields_type[index] = fields_type[index];
      } else {
        errors.push({
          'param': index,
          'error': listErrors(100)
        });
      }
    } else {
      errors.push({
        'param': index,
        'error': listErrors(101)
      });
    }
  });


  cb(errors.length ? errors : null, new_fields_type);
};
