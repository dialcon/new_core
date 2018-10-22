var base = require('../../../models');
var _ = require('lodash');
var async = require('async');
var checkSpaces = require('../../../libs/check_spaces');

var mongoose = require('mongoose');


var mongodb_modules = global.mongodb_modules;

exports.list = (req, res, next) => {
  var user = req.isAuthenticated();

  let find = {
    user: user.sub
  };
  if (req.query.name) {
    find.name = req.query.name;
  }

  base.Space.find(find, 'name active')
    .exec((err, spaces) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.send(spaces);
    });
};

exports.new = (req, res, next) => {
  //validación de campos
  req.sanitize('name').trim();
  req.checkBody({
    'name': {
      notEmpty: true,
      isAlphanumeric: {
        errorMessage: req.__('%s z solo puede contener números y letras', 'name')
      },
      errorMessage: req.__('%s no puede estar vacio', 'name')
    }
  });
  var errors = req.validationErrors();
  if (errors) {
    return res.status(400).send(errors);
  }

  //usuario en sesión
  var user = req.isAuthenticated();

  base.Space.findOne({
      user: user.sub,
      name: req.body.name
    }, 'name')
    .exec((err, spaces) => {
      if (err) {
        return res.status(500).send(err);
      }
      if (spaces) {
        return res.status(400).send({
          msg: req.__('%s ya esta en uso, ya existe un %s con ese valor %s', 'name', 'module', req.body.name)
        });
      }
      var space = new base.Space({
        user: user.sub,
        name: req.body.name
      });
      space.save((err) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(space);
      });
    });

};

exports.view = (req, res, next) => {
  //usuario en sesión
  var user = req.isAuthenticated();
  base.Space.findOne({
      _id: req.params.id,
      user: user.sub
    }, '-__v')
    .exec((err, spaces) => {
      if (err) {
        return res.status(500).send(err);
      } else if (!spaces) {
        return res.status(404).send({
          msg: 'El spacee no existe'
        });
      } else {
        return res.send(spaces);
      }
    });
};

exports.newModules = (req, res, next) => {
  //validación de campos
  req.sanitize('name').trim();
  req.sanitize('module_type').trim();
  req.checkBody({
    'name': {
      notEmpty: true,
      isAlphanumeric: {
        errorMessage: req.__('%s q solo puede contener números y letras', 'name')
      },
      errorMessage: req.__('%s no puede estar vacio', 'name')
    },
    'module_type': {
      notEmpty: true,
      matches: {
        options: [/(user|general|gps)/],
        errorMessage: req.__('Solo se permite %s para %s', global._regex_type_of_modules, 'module_type')
      },
      errorMessage: req.__('%s no puede estar vacio', 'module_type')
    }
  });
  var errors = req.validationErrors();
  if (errors) {
    return res.status(400).send(errors);
  }

  //usuario en sesión
  var user = req.isAuthenticated();

  base.Space.findOne({
      _id: req.params.id,
      user: user.sub
    }, 'name modules')
    .exec(function (err, space) {
      if (err) {
        return res.status(500).send(err);
      }
      if (!space) {
        return res.status(400).send({
          msg: req.__('%s no existe', 'componet')
        });
      }
      var name = _.find(space.modules, (obj) => {
        return obj.name === req.body.name;
      });
      if (name) {
        return res.status(400).send({
          msg: req.__('%s ya esta en uso, ya existe un %s con ese valor %s', 'name', 'module', req.body.name)
        });
      }

      space.modules.push({
        new: true,
        name: req.body.name,
        module_type: req.body.module_type
      });
      space.save((err) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(space);
      });
    });

};

exports.summary = (req, res, next) => {
  var user = req.isAuthenticated();

  base.Space.aggregate([{
    $match: {
      user: mongoose.Types.ObjectId(user.sub)
    }
  }, {
    $project: {
      numberOfModules: {
        $size: "$modules"
      },
      numberOfStatesMachines: {
        $size: "$states_machines"
      }

    }
  }], (err, c) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.send({
      spaces: c.length,
      modules: _.sumBy(c, 'numberOfModules'),
      statesMachines: _.sumBy(c, 'numberOfStatesMachines')
    });
  });
};

exports.editModules = (req, res, next) => {
  //validación de campos
  req.checkBody({
    fields: {
      notEmpty: true,
      errorMessage: req.__('%s no puede estar vacio', 'fields')
    },
    fields_type: {
      notEmpty: true,
      errorMessage: req.__('%s no puede estar vacio', 'fields_type')
    },
    keys: {
      notEmpty: true,
      errorMessage: req.__('%s no puede estar vacio', 'keys')
    }
  });
  var errors = req.validationErrors();
  if (errors) {
    return res.status(400).send(errors);
  }

  //usuario en sesión
  var user = req.isAuthenticated();

  base.Space.findOne({
      _id: req.params.id,
      user: user.sub,
      modules: {
        $elemMatch: {
          _id: req.params.module
        }
      }
      //'modules._id': req.params.module
    }, 'name type modules')
    .exec(function (err, space) {
      if (err) {
        return res.status(500).send(err);
      }
      if (!space) {
        return res.status(400).send({
          msg: req.__('%s no existe', 'componet')
        });
      }
      var module = _.find(space.modules, (item) => {
        return item._id.toString() === req.params.module;
      });
      async.auto({
        fields: (cb) => {
          checkSpaces.checkFields(req.body.fields, cb);
        },
        fields_type: ['fields', (results, cb) => {
          checkSpaces.checkFieldsType(results.fields, req.body.fields_type, cb);
        }],
        keys: ['fields', (results, cb) => {
          checkSpaces.checkKeys(results.fields, req.body.keys, cb);
        }],
        checkIsUser: ['fields', 'fields_type', 'keys', (results, cb) => {
          module.fields = results.fields;
          module.fields_type = results.fields_type;
          module.keys = results.keys;
          module.new = true;

          checkSpaces.checkIsUser(module, cb);
        }]
      }, (err, results) => {

        if (err) {
          return res.status(500).send(err);
        }
        //res.send(space);
        space.save((err) => {
          if (err) {
            return res.status(500).send(err);
          }
          res.send(module);
        });
      });
    });

};

exports.cron = (req, res, next) => {
  function createIndexModules(line, cb) {
    //console.log(line);
    let [name, keys, options] = line;
    mongodb_modules.db.createIndex(name, keys, options, cb);
  }

  function eachSpace(space, cb) {
    async.map(space.modules, (module, cb) => {
      let collection = `${space._id}_${space.name}_${module.name}`;
      let indexes = [];
      _.forEach(module.fields, (val, index) => {
        let a = {};
        let mongo_index = index.replace(/[-+]/g, '.');
        switch (module.keys[index]) {
          case 'UNIQUE':
            a[mongo_index] = 1;
            indexes.push([collection, a, {
              unique: true,
              background: true
            }]);
            break;
          case 'INDEX':
            a[mongo_index] = 1;
            indexes.push([collection, a, {
              background: true
            }]);
            break;
          case '2DSPHERE':
            a[mongo_index] = '2dsphere';
            indexes.push([collection, a, {
              background: true
            }]);
            break;
          default:
        }
      });
      module.new = false;

      async.map(indexes, createIndexModules, cb);

      // async.parallel({
      //   modules: (cb) => {
      //     async.map(indexes, createIndexModules, cb);
      //   },
      //   tracking: (cb) => {
      //     async.map(indexes, createIndexTracking, cb);
      //   }
      // }, cb);

    }, cb);


  }

  base.Space.find({
      //'modules.new': true
    }, 'name modules')
    .exec((err, spaces) => {
      if (err) {
        return res.status(500).send(err);
      }
      async.map(spaces, (space, cb) => {
        eachSpace(space, (err) => {
          if (err) {
            return cb(err);
          }
          space.save(cb);
        });

      }, (err, results) => {
        res.send({
          ok: spaces.length
        });
      });

    });

};