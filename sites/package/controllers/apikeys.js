var base = require('../../../models');
var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');

function stringGen(len) {
  var text = '';

  var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (var i = 0; i < len; i++) {
    text += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return text;
}

exports.list = (req, res, next) => {
  var user = req.isAuthenticated();
  if (req.query.name) {
    base.ApiKey.aggregate([{
        $match: {
          space: mongoose.Types.ObjectId(req.params.space),
          user: mongoose.Types.ObjectId(user.sub)
        }
      }, {
        $project: {
          keys: {
            $filter: {
              input: '$keys',
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
          'keys.key': 1,
          'keys.name': 1,
          'keys.secret': 1,
          'keys.active': 1
        }
      }])
      .exec((err, space) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(space[0].keys);
      });
  } else {
    base.ApiKey.findOne({
        user: user.sub,
        space: mongoose.Types.ObjectId(req.params.space)
      }, 'keys.key keys.name keys.secret keys.active')
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
  req.sanitize('name').trim();
  req.checkBody({
    'name': {
      notEmpty: true,
      isAlphanumeric: {
        errorMessage: 'name x solo puede contener números y letras'
      },
      errorMessage: 'name es requerido'
    },
    'space': {
      notEmpty: true,
      isAlphanumeric: {
        errorMessage: 'space solo puede contener números y letras'
      },
      errorMessage: 'space es requerido'
    }
  });
  var errors = req.validationErrors();
  if (errors) {
    return res.status(400).send(errors);
  }

  //usuario en sesión
  var user = req.isAuthenticated();

  async.waterfall([
    (cb) => {
      base.Space.findOne({
          user: user.sub,
          name: req.body.space
        }, 'name')
        .exec(function(err, space) {
          if (err) {
            return cb(err);
          } else if (!space) {
            return cb({
              "param": "space",
              "msg": "space no existe"
            });
          }
          cb(null, space);
        });
    },
    (space, cb) => {
      base.ApiKey.findOne({
          space: space._id
        }, 'keys')
        .exec(function(err, apikeys) {
          if (err) {
            return cb(err);
          }
          cb(null, space, apikeys);
        });
    }
  ], (err, space, apikeys) => {
    if (err) {
      return res.status(400).send(err);
    }

    var apikeystr = stringGen(20);
    var apisecstr = stringGen(100);

    if (apikeys) {
      var name = _.find(apikeys.keys, (item) => {
        return item.name === req.body.name;
      });
      if (name) {
        return res.status(400).send({
          msg: 'El nombre del apikey ya esta en uso.'
        });
      } else {
        apikeys.keys.push({
          key: apikeystr,
          secret: apisecstr,
          name: req.body.name
        });
      }
    } else {
      apikeys = new base.ApiKey({
        user: user.sub,
        space: space._id,
        keys: {
          key: apikeystr,
          secret: apisecstr,
          name: req.body.name
        }
      });
    }
    apikeys.save(function(err) {
      if (err) {
        return res.status(500).send(err);
      }
      res.send({
        key: apikeystr,
        secret: apisecstr
      });
    });
  });
};
