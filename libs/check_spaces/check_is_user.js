'use strict';
var _ = require('lodash');

module.exports = function (module, cb) {
  var errors = [];

  if (module.module_type === 'user') {
    if (!module.fields.email) {
      errors.push({
        'param': 'email',
        'msg': 'email es requerido'
      });
    } else {
      if (!module.fields.email.notEmpty) {
        errors.push({
          'param': 'email.notEmpty',
          'msg': 'email.notEmpty es requerido'
        });
      }
      if (!module.fields.email.isEmail) {
        errors.push({
          'param': 'email.isEmail',
          'msg': 'email.isEmail es requerido'
        });
      }
    }
    if (!module.fields.password) {
      errors.push({
        'param': 'password',
        'msg': 'password es requerido'
      });
    } else {
      if (!module.fields.password.notEmpty) {
        errors.push({
          'param': 'password.notEmpty',
          'msg': 'password.notEmpty es requerido'
        });
      }
      if (!module.fields.password.isLength || !_.isArray(module.fields.password.isLength.options) || !module.fields.password.isLength.options[0].min) {
        errors.push({
          'param': 'password.isLength.options[{min}]',
          'msg': 'password.isLength.options.[{min}] es requerido'
        });
      }
    }
    if (!module.fields.password_temp) {
      errors.push({
        'param': 'password_temp',
        'msg': 'password_temp es requerido'
      });
    }
    if (!module.fields_type.email || (module.fields_type.email && module.fields_type.email !== 'S')) {
      errors.push({
        'param': 'email',
        'msg': 'email debe ser siempre S'
      });
    }
  }

  cb(errors.length ? errors : null);

};