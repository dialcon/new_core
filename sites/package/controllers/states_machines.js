var base = require('../../../models');
var _ = require('lodash');
var async = require('async');
var checkStates = require('../../../libs/check_states');
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
          states_machines: {
            $filter: {
              input: '$states_machines',
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
          'states_machines._id': 1,
          'states_machines.name': 1,
          'states_machines.next_state': 1
        }
      }])
      .exec((err, space) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(space[0].states_machines);
      });
  } else {
    base.Space.findOne({
        _id: req.params.id,
        user: user.sub,
        states_machines: {
          $elemMatch: {
            _id: req.params.state_machine
          }
        }
      }, 'states_machines')
      .exec((err, space) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(space.states_machines);
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
        errorMessage: req.__('%s r solo puede contener números y letras', 'name')
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
      _id: req.params.id,
      user: user.sub
    }, 'name states_machines')
    .exec(function (err, space) {
      if (err) {
        return res.status(500).send(err);
      }
      if (!space) {
        return res.status(400).send({
          msg: req.__('%s no existe', 'componet')
        });
      }
      var name = _.find(space.states_machines, (obj) => {
        return obj.name === req.body.name;
      });
      if (name) {
        return res.status(400).send({
          msg: req.__('%s ya esta en uso', 'name')
        });
      }

      space.states_machines.push({
        new: true,
        name: req.body.name
      });
      space.save(function (err) {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(space);
      });
    });

};

exports.edit = (req, res, next) => {
  //validación de campos
  req.checkBody({
    states: {
      notEmpty: true,
      errorMessage: req.__('%s no puede estar vacio', 'states')
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
      states_machines: {
        $elemMatch: {
          _id: req.params.state_machine
        }
      }
    }, 'name type states_machines')
    .exec(function (err, space) {
      if (err) {
        return res.status(500).send(err);
      }
      if (!space) {
        return res.status(400).send({
          msg: req.__('%s no existe', 'componet')
        });
      }
      var state_machine = _.find(space.states_machines, (item) => {
        return item._id.toString() === req.params.state_machine;
      });
      async.parallel({
        states: (cb) => {
          checkStates.next_state(req.body.states, cb);
        }
      }, (err, results) => {

        if (err) {
          return res.status(500).send(err);
        }
        state_machine.states = results.states;
        //res.send(space);
        space.save((err) => {
          if (err) {
            return res.status(500).send(err);
          }
          res.send(state_machine);
        });
      });
    });

};