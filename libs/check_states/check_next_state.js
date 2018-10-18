'use strict';
var _ = require('lodash');
var validator = require('validator');

module.exports = function(states, cb) {
  var errors = [];
  var keys = {};

  _.forEach(states, (val) => {

    if (validator.matches(val.name, /^[a-zA-Z0-9_.-]+$/)) {
      if (keys[val.name]) {
        errors.push({
          'param': val.name,
          'msg': global.__('%s ya se ha definido', val.name)
        });
      } else {
        keys[val.name] = true;
      }
    } else {
      errors.push({
        'param': val.name,
        'msg': global.__('%s no es un nombre de estado válido', val.name)
      });
    }
  });
  if (errors.length) {
    return cb(errors);
  }
  _.forEach(states, (val) => {

    if (_.isArray(val.next_state)) {
      _.forEach(val.next_state, (_val) => {
        _val = "" + _val;
        if (!keys[_val]) {
          errors.push({
            'param': _val,
            'msg': global.__('%s no puede ir a %s porque no se ha definido', val.name, _val)
          });
        }
      });
    } else {
      val.next_state = [];
    }
  });

  cb(errors.length ? errors : null, states);
};
