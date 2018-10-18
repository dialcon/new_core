'use strict';
var _ = require('lodash');
var validator = require('validator');

var options = require('./options');

module.exports = function (fields, cb) {
  if (!_.isObject(fields) || _.isArray(fields)) {
    return cb({
      'param': 'fields',
      'msg': global.__('debe ser un objeto de campos válidos')
    });
  }
  var errors = [];
  var new_fields = {};
  var new_states = [];

  _.forEach(fields, (obj, index) => {

    if (validator.matches(index, /^[a-zA-Z0-9_.\-+]+$/)) {
      //valida las opciones
      let j = {};
      _.forEach(obj, (_obj, _index) => {
        if (options[_index] && _.isBoolean(options[_index])) {
          //inserta valor
          if (['errorMessage',
              'arrayObject',
              'toObject',
              'arrayNormal',
              'objectNormal',
              'reverseLocation',
              'reverseAddress',
              'default',
              'state'
            ].indexOf(_index) >= 0) {
            j[_index] = _obj;
          } else if (_obj.errorMessage) {
            j[_index] = {
              errorMessage: _obj.errorMessage
            };
          } else {
            j[_index] = true;
          }
        } else if (options[_index]) {
          _.forEach(_obj, (__obj, __index) => {
            if (__index === 'errorMessage') {
              if (!j[_index]) {
                j[_index] = {};
              }
              j[_index][__index] = __obj;
            } else if (__index === 'options' && _.isArray(__obj)) {
              _.forEach(__obj[0], (___obj, ___index) => {
                if (options[_index][___index]) {
                  if (!j[_index]) {
                    j[_index] = {};
                  }
                  if (!j[_index][__index]) {
                    j[_index][__index] = [{}];
                  }
                  j[_index][__index][0][___index] = ___obj;
                }
              });
            }
          });
        }
      });
      if (_.size(j)) {
        new_fields[index] = j;
      }
    } else {
      errors.push({
        'param': index,
        'msg': global.__('solo debe contener números, letras, \'-\' y \'_\'')
      });
    }
  });
  _.forEach(new_states, (item) => {
    new_fields[item] = true;
  });
  new_fields.active = {
    isBoolean: {
      errorMessage: global.__('active es inválido')
    }
  };
  new_fields.createdAt = {
    isDate: {
      errorMessage: global.__('createdAt es inválido')
    }
  };
  new_fields.updatedAt = {
    isDate: {
      errorMessage: global.__('updatedAt es inválido')
    }
  };

  cb(errors.length ? errors : null, new_fields);
};