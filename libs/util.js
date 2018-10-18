var _ = require('lodash');
var moment = require('moment');
var mongoose = require('mongoose');
var validator = require('validator');
var listOptions = require(`${global.path}/libs/check_spaces/options`);

var toBoolean = exports.toBoolean = function (_v) {
  if (_.isString(_v)) {
    switch (_v.toLowerCase().trim()) {
      case "true":
      case "yes":
      case "1":
        return true;
      case "false":
      case "no":
      case "0":
      case null:
        return false;
      default:
        return Boolean(_v);
    }
  } else if (_.isBoolean(_v)) {
    return _v;
  } else if (_.isNumber(_v)) {
    return _v !== 0;
  }
  return false;
};

exports.test = function (name, value, options, errors) {
  if (_.isArray(value)) {
    //console.log('ARREGLO');
    return;
  }

  if (_.isUndefined(value) || _.isNull(value)) {
    value = '';
  }
  if (!value && !_.isUndefined(options.default)) {
    value = options.default;
  }
  if (!_.isString(value)) {
    value = String(value);
  }

  _.forEach(options, (item, key) => {
    let args = [];
    if (value && [
        'errorMessage',
        'array',
        'object',
        'arrayObject',
        'toObject',
        'arrayNormal',
        'objectNormal',
        'notEmpty',
        'optional',
        'reverseAddress',
        'reverseLocation',
        'default',
        'isDate',
        'state',
        //del validator
        'matches'
      ].indexOf(key) === -1) {

      args[0] = value;
      args[1] = {};
      if (item.options) {
        args[1] = _.first(item.options);
      }

      if (validator[key](...args) !== true) {
        errors.push({
          param: name,
          title: item.errorMessage,
          errorMessage: item.errorMessage
        });
      }
    } else if (key === 'matches') {
      let opt = args[1] = _.first(item.options);
      args[0] = value;
      args[1] = opt.pattern;
      args[2] = opt.modifiers;
      if (validator[key](...args) !== true) {
        errors.push({
          param: name,
          title: item.errorMessage,
          errorMessage: item.errorMessage
        });
      }
    } else if (key === 'notEmpty') {
      if (_.isUndefined(value) || _.isNull(value) || validator.isEmpty(value) === true) {
        errors.push({
          param: name,
          title: options.errorMessage,
          errorMessage: options.errorMessage
        });
      }
    } else if (key === 'arrayNormal') {
      if (_.isArray(value) !== true) {
        errors.push({
          param: name,
          title: options.errorMessage,
          errorMessage: options.errorMessage
        });
      }
    }

  });
};

var paths = exports.paths = function (obj, new_obj, parentKey) {
  new_obj = new_obj || {};
  if (_.isArray(obj)) {
    _.forEach(obj, (i, k) => {
      paths(i, new_obj, parentKey ? `${parentKey}.${k}` : k);
    });
  } else if (_.isPlainObject(obj)) {
    _.forEach(obj, (i, k) => {
      paths(i, new_obj, parentKey ? `${parentKey}.${k}` : k);
    });
  } else {
    if (typeof obj !== 'undefined') {
      new_obj[parentKey] = obj;
    }
  }
  return new_obj;
};

var check = exports.check = function (obj, fields_type, new_obj, parentKey = '') {
  new_obj = new_obj || {};
  _.forEach(obj, (sub_obj, key) => {

    if (fields_type[key] === 'A' && _.isArray(sub_obj)) {

      new_obj[`${parentKey}${key}`] = [];
      _.forEach(sub_obj, (i, k) => {
        //new_obj[`${parentKey}${key}`].push();
        let t = {};
        _.forEach(fields_type, (item, keyi) => {
          if (keyi.indexOf(`${key}${parentKey}+`) >= 0) {
            t[keyi] = item;
          }
        });
        new_obj[`${parentKey}${key}`].push(t);

        //new_obj[`${parentKey}${key}`].push(check(i, fields_type, {}, `${parentKey}${key}+`));
      });
    } else if (_.isPlainObject(sub_obj) && fields_type[key] === 'O') {
      check(sub_obj, fields_type, new_obj, `${parentKey}${key}-`);
    } else {
      //console.log(fields_type[key], sub_obj)
      new_obj[`${parentKey}${key}`] = sub_obj;
    }
  });
  return new_obj;
};

function mongoId(str) {
  if (_.isUndefined(str)) {
    return null;
  }
  if (_.isPlainObject(str) && str._id) {
    str = str._id;
  }
  str = String(str);
  if (validator.isMongoId(str) === true) {
    return mongoose.Types.ObjectId(str);
  } else {
    return null;
  }
}

exports.parseTypes = function (type, val, forced) {
  if (_.isUndefined(val) || _.isNull(val)) {
    return val;
  }
  let _v;
  switch (type) {
    case 'PP':
      if (!_.isArray(val) || val.length < 2) {
        val = [0, 0];
      }
      _v = {
        type: 'Point',
        coordinates: [parseFloat(val[1]), parseFloat(val[0])]
      };
      break;
    case 'PL':
      _v = {
        type: 'Polygon',
        coordinates: [_.map(val, (item) => {
          return [parseFloat(item[1]), parseFloat(item[0])];
        })]
      };
      let f = _.first(_v.coordinates[0]);
      let l = _.last(_v.coordinates[0]);
      if (f && (f[0] !== l[0] || f[1] !== l[1])) {
        _v.coordinates[0].push([f[0], f[1]]);
      }
      break;
    case 'N':
      _v = parseFloat(val);
      break;
    case 'S':
      _v = String(val);
      break;
    case 'D':
      _v = moment(val).toDate();
      break;
    case 'B':
      _v = toBoolean(val);
      break;
    case undefined:
    case 'TO':
      _v = mongoId(val);
      break;
    case 'AO':
      _v = _.isArray(val) ? _.map(val, (item) => {
        return mongoId(item);
      }) : mongoId(val);
      break;
    case 'AN':
      _v = _.isArray(val) ? val : [];
      break;
    default:
      _v = val;
  }
  return _v;
};