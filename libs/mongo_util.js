'use strict';
var types = require('mongoose').Types;
var _ = require('lodash');
var moment = require('moment');
var util = require(`${global.path}/libs/util`);


function getDefault(object) {
  let defaultValue = {};
  _.forEach(object, (val, path) => {
    let descendant = _.get(defaultValue, path);
    if (typeof descendant === 'undefined') {
      _.set(defaultValue, path, val);
    }
  });
  return defaultValue;
}

function stringToFormat(item) {
  if (item && item.length === 24 && item.match(/[0-9a-fA-F]{24}/i)) {
    return types.ObjectId(item);
  }
  //busca si es una fecha
  else if (item.match(/^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01]) (00|[0-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9]):([0-9]|[0-5][0-9])$/g)) {
    return moment(item).toDate();
  } else if (item.match(/(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d)/g)) {
    return moment(item).toDate();
  } else if (item === 'null') {
    return null;
  } else if (item === 'true') {
    return true;
  } else if (item === 'false') {
    return false;
  } else {
    return item;
  }
}

function updateType(obj) {
  let n_arr = [];
  if (_.isArray(obj)) {
    _.forEach(obj, (item, i) => {
      n_arr.push(updateType(item));
    });
    return n_arr;
  } else if (_.isString(obj)) {
    return stringToFormat(obj);
  } else if (_.isPlainObject(obj)) {
    let n_obj = {};
    _.forEach(obj, (item, index) => {
      n_obj[index] = updateType(item);
    });
    return n_obj;
  } else {
    return obj;
  }

  // let n_obj = {};
  // _.forEach(obj, (item, index) => {
  //   if (_.isArray(item)) {
  //     n_obj[index] = [];
  //     _.forEach(item, (i) => {
  //       n_obj[index].push(_.isString(i) ? stringToFormat(i) : updateType(i));
  //     });
  //   } else if (_.isPlainObject(item)) {
  //     n_obj[index] = updateType(item);
  //   } else if (_.isString(item)) {
  //     n_obj[index] = stringToFormat(item);
  //   } else {
  //     n_obj[index] = item;
  //   }
  // });
  // return n_obj;
}

exports.updateType = updateType;

exports.parseSelect = function (select) {
  select = _.trim(select);
  if (!select) {
    return '';
  }
  let fields = select.replace(/ /g, '').split(',');
  let s = {
    valid: {},
    remove: {}
  };
  let valid = false;
  _.forEach(fields, (item) => {
    let i = _.trimStart(item, '+-');
    if (item && item[0] === '-') {
      s.remove[i] = 0;
    } else {
      let ii = i.split(/[*=]/);
      if (ii[1] && ii[1].length === 24 && ii[1].match(/[0-9a-fA-F]{24}/i)) {
        s.valid[ii[0]] = types.ObjectId(ii[1]);
      } else if (ii[1] && ii[1].match(/^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01]) (00|[0-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9]):([0-9]|[0-5][0-9])$/g)) {
        s.valid[ii[0]] = moment(ii[1]).toDate();
      } else if (ii[0].match(/\$elemMatch/)) {
        _.set(s.valid, ii[0], ii[1] ? ii[1] : 1);
      } else {
        s.valid[ii[0]] = ii[1] ? ii[1] : 1;
      }
      valid = true;
    }
  });
  if (!valid) {
    s.valid = s.remove;
    s.remove = null;
  }
  return s;
};

exports.parsePopulate = function (populate, fields_type) {
  populate = _.trim(populate);
  if (!populate) {
    return {};
  }
  let fields = populate.replace(/ /g, '').split('|');
  let s = [];
  _.forEach(fields, (item) => {
    let field = item.split(':');
    let collection = fields_type[field[0]] ? fields_type[field[0]].toObject || fields_type[field[0]].arrayObject : null;
    if (collection) {
      s.push({
        field: field[0],
        return: field[1],
        collection: collection
      });
    }

  });
  return s;
};

exports.aggregate = function (collection, match, callback) {
  match = _.map(match, (i) => updateType(i));
  console.log('MATCH', JSON.stringify(match));
  let cursor = collection.aggregate(match);
  let docs = [];

  cursor.each((err, doc) => {
    if (err) {
      return callback(err);
    }
    if (doc !== null) {
      docs.push(doc);
    } else {
      callback(null, docs);
    }
  });
};

exports.findById = function (collection, _id, select, callback) {
  let fields = this.parseSelect(select);

  console.log('fields.valid', fields.valid)
  let cursor = collection.find({
    _id: types.ObjectId(_id)
  }, {
      limit: 1,
      projection: fields.valid
    });
  let docs = [];

  cursor.each((err, doc) => {
    if (err) {
      return callback(err);
    }
    if (doc !== null) {
      docs.push(doc);
    } else {
      callback(null, docs.length ? docs[0] : null);
    }
  });
};

exports.findOne = function (collection, query, select, callback) {
  let fields = this.parseSelect(select);
  let cursor = collection.find(query, {
    limit: 1,
    projection: fields.valid
  });
  let docs = [];

  cursor.each((err, doc) => {
    if (err) {
      return callback(err);
    }
    if (doc !== null) {
      docs.push(doc);
    } else {
      callback(null, docs.length ? docs[0] : null);
    }
  });
};

exports.insert = function (collection, body, callback) {
  //body = getDefault(util.paths(body));
  body = getDefault(body);
  collection.insert([body], {
    w: 1,
    fullResult: true
  }, function (err, result) {
    if (err) {
      return callback(err);
    }
    collection.findOneAndUpdate({
      _id: result.insertedIds[0]
    }, {
        $set: {
          id: result.insertedIds[0].toString().substr(-8)
        }
      }, function (err, r) {
        if (err) {
          return callback(err);
        }
        callback(null, result);
      });
  });
};

exports.updateById = function (collection, _id, set, select, callback) {
  //deshabilitado hasta entender
  //set = util.paths(set);
  let fields = this.parseSelect(select);
  collection.findOneAndUpdate({
    _id: types.ObjectId(_id)
  }, {
      $set: set
    }, {
      projection: fields.valid,
      returnOriginal: false
    }, function (err, result) {
      if (err) {
        return callback(err);
      }
      callback(null, result.value);
    });
};

exports.updateQuery = function (collection, query, set, select, callback) {
  let fields = this.parseSelect(select);
  collection.update(query, {
    $set: set
  }, {
      projection: fields.valid,
      returnOriginal: false,
      multi: true
    }, function (err, result) {
      if (err) {
        return callback(err);
      }
      callback(null, result.result);
    });
};

exports.updateTransaction = function (collection, query, update, select, callback) {
  let fields = this.parseSelect(select);

  if (!update) {
    return callback({
      error: 'NADA PARA ACTUALIZAR',
      query: JSON.stringify(query),
      update: JSON.stringify(update)
    });
  }
  collection.findOneAndUpdate(query, update, {
    projection: fields.valid,
    returnOriginal: false
  }, function (err, result) {
    if (err) {
      return callback(err);
    }
    callback(null, result);
  });
};


exports.pushById = function (collection, _id, push, select, callback) {
  push = getDefault(util.paths(push));
  let fields = this.parseSelect(select);
  collection.findOneAndUpdate({
    _id: types.ObjectId(_id)
  }, {
      $set: {
        updatedAt: moment().toDate()
      },
      $push: push
    }, {
      projection: fields.valid,
      returnOriginal: false
    }, function (err, result) {
      if (err) {
        return callback(err);
      }
      callback(null, result.value);
    });
};

exports.deleteById = function (collection, _id, callback) {
  collection.remove({
    _id: types.ObjectId(_id)
  }, {
      justOne: true
    }, function (err, result) {
      if (err) {
        return callback(err);
      }
      callback(null, result.result);
    });
};

exports.pullById = function (collection, _id, field_id, field, select, callback) {
  let fields = this.parseSelect(select);
  let search = {};
  search[field] = {
    _id: types.ObjectId(field_id)
  };
  collection.findOneAndUpdate({
    _id: types.ObjectId(_id)
  }, {
      $pull: search
    }, {
      projection: fields.valid,
      returnOriginal: false
    }, function (err, result) {
      if (err) {
        return callback(err);
      }
      callback(null, result.value);
    });
};

exports.getId = function (_id) {
  return types.ObjectId(_id);
};

var changeIntoArraysPP = exports.changeIntoArraysPP = function (item, i) {
  let ia = i.split('+', 2);
  if (ia.length === 1) {
    if (_.get(item, i)) {
      let p = (_.get(item, i)).coordinates;
      if (p) {
        _.set(item, i, [p[1], p[0]]);
      }
    }
  } else {
    _.forEach(item[ia[0]], (item) => {
      changeIntoArraysPP(item, ia[1]);
    });
  }
};

var changeIntoArraysPL = exports.changeIntoArraysPL = function (item, i) {
  let ia = i.split('+', 2);
  if (ia.length === 1) {
    if (_.get(item, i)) {
      _.set(item, i, _.map((_.get(item, i)).coordinates[0], p => {
        return [p[1], p[0]];
      }));
    }
  } else {
    _.forEach(item[ia[0]], (item) => {
      changeIntoArraysPL(item, ia[1]);
    });
  }
};