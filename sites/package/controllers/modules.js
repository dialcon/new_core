var base = require('../../../models');
var _ = require('lodash');
var async = require('async');
var checkSpaces = require('../../../libs/check_spaces');
var mongoose = require('mongoose');

exports.list = (req, res, next) => {
  var user = req.isAuthenticated();
  if (req.query.name) {
    base.Space.aggregate([{
        $match: {
          _id: mongoose.Types.ObjectId(req.params.id),
          user: mongoose.Types.ObjectId(user.sub)
        }
      }, {
        $project: {
          modules: {
            $filter: {
              input: '$modules',
              as: 'shape',
              cond: {
                $eq: ['$$shape.name', req.query.name]
              }
            }
          },
          _id: 0
        }
      }, {
        $project: {
          'modules._id': 1,
          'modules.name': 1,
          'modules.module_type': 1,
          'modules.active': 1
        }
      }])
      .exec((err, space) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(space[0].modules);
      });
  } else {
    base.Space.findOne({
        _id: req.params.id,
        user: user.sub
      }, 'modules._id modules.name modules.module_type modules.active')
      .exec((err, space) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(space.modules);
      });

  }
};
exports.new = (req, res, next) => {
  //validación de campos
  var regex_name = new RegExp(global._regex_name_of_modules);
  var regex_type = new RegExp(global._regex_type_of_modules);

  req.sanitize('name').trim();
  req.sanitize('module_type').trim();
  req.checkBody({
    'name': {
      notEmpty: true,
      matches: {
        options: [regex_name],
        errorMessage: req.__('%s y solo puede contener números, letras y "_"', 'name')
      },
      errorMessage: req.__('%s no puede estar vacio', 'name')
    },
    'module_type': {
      notEmpty: true,
      matches: {
        options: [regex_type],
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
    .exec(function(err, space) {
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
          msg: req.__('%s ya esta en uso', 'name')
        });
      }

      space.modules.push({
        new: true,
        name: req.body.name,
        module_type: req.body.module_type
      });
      space.save(function(err) {
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
      user: user.sub,
      modules: {
        $elemMatch: {
          _id: req.params.module
        }
      }
      //'modules._id': req.params.module
    }, 'name type modules.$')
    .exec(function(err, space) {
      if (err) {
        return res.status(500).send(err);
      }
      if (!space) {
        return res.status(400).send({
          msg: req.__('%s no existe', 'componet')
        });
      }
      res.send(space);
    });
};

exports.edit = (req, res, next) => {
  //console.log(JSON.stringify(req.body));
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
    .exec(function(err, space) {
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
          //console.log(err);
          return res.status(500).send(err);
        }
        //res.send(space);
        space.save((err) => {
          if (err) {
            //console.log(err);
            return res.status(500).send(err);
          }
          res.send(module);
        });
      });
    });

};
