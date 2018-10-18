'use strict';
var async = require('async');
var _ = require('lodash');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var jwt = require('jsonwebtoken');
var moment = require('moment');
var request = require('request');
var base = require(`${global.path}/models`);
var redis_util = require(`${global.path}/libs/redis_util`);
var mongo_util = require(`${global.path}/libs/mongo_util`);
var listErrors = require(`${global.path}/libs/errors`);


var bcrypt = require('bcrypt-nodejs');
var mongoose = global.mongodb_modules;

var comparePassword = function (password, field, cb) {
  bcrypt.compare(password, field, function (err, isMatch) {
    cb(err, isMatch);
  });
};

function generateToken(user, secret, post) {
  var payload = {
    iss: 'localhost',
    _id: user._id,
    device_id: post ? post.device_id : null,
    fcm_id: post ? post.fcm_id : null,
    iat: moment().unix(),
    exp: moment().add(1, 'years').unix()
  };
  return jwt.sign(payload, secret);
}

/**
 * Login required middleware
 */
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(401).send({
      msg: 'Unauthorized'
    });
  }
};
/**
 * POST /login
 * Sign in with email and password
 */
exports.loginPost = (req, res, next) => {
  req.assert('email', 'EmailNotValid').isEmail();
  req.assert('email', 'EmailNotEmpty').notEmpty();
  req.assert('password', 'PasswordNotEmpty').notEmpty();
  req.sanitize('email').normalizeEmail({
    remove_dots: false,
    all_lowercase: true
  });

  var errors = req.validationErrors();

  if (errors) {
    let n_errors = [];
    _.forEach(errors, (item) => {
      n_errors.push({
        param: item.param,
        title: item.msg,
        errorMessage: item.msg
      });
    });
    return res.status(400).send(n_errors);
  }

  var key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;
  redis_util.getModule(req, key, req.params.componet, req.params.module, (err, _id, fields) => {
    if (err) {
      return res.status(400).send(err);
    }

    var name_collection = `${_id}_${req.params.componet}_${req.params.module}`;
    var collection = mongoose.db.collection(name_collection.toLowerCase());
    var ret = req.query.return || '';

    ret += (ret ? ',password,password_temp' : '');

    //busca si se debe popular
    var populate = mongo_util.parsePopulate(req.query.populate, fields.fields);

    mongo_util.findOne(collection, {
      email: req.body.email,
      active: true
    }, ret, (err, user) => {
      if (err) {
        return listErrors(10001, res);
      } else if (!user) {
        return listErrors(2006, res);
      } else {
        async.parallel({
          normal: (cb) => {
            comparePassword(req.body.password, user.password, cb);
          },
          temp: (cb) => {
            comparePassword(req.body.password, user.password_temp, cb);
          }
        }, (err, results) => {
          if (!results.normal && !results.temp) {
            return listErrors(2007, res);
          }
          //busca el secrect
          redis_util.getApiSecret(req, key, req.params.componet, (err, key) => {
            if (err) {
              return listErrors(10001, res);
            }
            user.password = '';
            user.password_temp = '';
            //popula
            if (populate.length) {
              async.mapLimit(populate, 10, (model, cb) => {
                let name_collection = `${_id}_${req.params.componet}_${model.collection}`;
                let collection = mongoose.db.collection(name_collection.toLowerCase());
                if (_.isArray(user[model.field])) {
                  async.mapLimit(user[model.field], 10, (_id, cb) => {
                    mongo_util.findById(collection, _id, model.return, cb);
                  }, (err, results) => {
                    cb(err, user[model.field] = results);
                  });
                } else {
                  mongo_util.findById(collection, user[model.field], model.return, (err, results) => {
                    cb(err, user[model.field] = results);
                  });
                }
              }, (err, results) => {
                if (err) {
                  return res.status(401).send({
                    param: req.params.module,
                    msg: req.__('Error %s: %s', err.code, err.errmsg)
                  });
                } else {
                  res.send({
                    token: generateToken(user, key.secret, req.body),
                    user: user
                  });
                }
              });
            } else {
              res.send({
                token: generateToken(user, key.secret, req.body),
                user: user
              });
            }
          });

        });
      }
    });
  });
};

/**
 * POST /signup
 */
exports.signupPost = (req, res, next) => {
  req.assert('name', 'Name cannot be blank').notEmpty();
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('email', 'Email cannot be blank').notEmpty();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.sanitize('email').normalizeEmail({
    remove_dots: false
  });

  var errors = req.validationErrors();

  if (errors) {
    return res.status(400).send(errors);
  }

  base.User.findOne({
    email: req.body.email
  }, function (err, user) {
    if (user) {
      return res.status(400).send({
        msg: 'The email address you have entered is already associated with another account.'
      });
    }
    user = new base.User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password
    });
    user.save(function (err) {
      res.send({
        token: generateToken(user),
        user: user
      });
    });
  });
};

/**
 * PUT /account
 * Update profile information OR change password.
 */
exports.accountPut = (req, res, next) => {
  if ('password' in req.body) {
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirm', 'Passwords must match').equals(req.body.password);
  } else {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('email', 'Email cannot be blank').notEmpty();
    req.sanitize('email').normalizeEmail({
      remove_dots: false
    });
  }

  var errors = req.validationErrors();

  if (errors) {
    return res.status(400).send(errors);
  }

  base.User.findById(req.user.id, function (err, user) {
    if ('password' in req.body) {
      user.password = req.body.password;
    } else {
      user.email = req.body.email;
      user.name = req.body.name;
      user.gender = req.body.gender;
      user.location = req.body.location;
      user.website = req.body.website;
    }
    user.save(function (err) {
      if ('password' in req.body) {
        res.send({
          msg: 'Your password has been changed.'
        });
      } else if (err && err.code === 11000) {
        res.status(409).send({
          msg: 'The email address you have entered is already associated with another account.'
        });
      } else {
        res.send({
          user: user,
          msg: 'Your profile information has been updated.'
        });
      }
    });
  });
};

/**
 * DELETE /account
 */
exports.accountDelete = (req, res, next) => {
  base.User.remove({
    _id: req.user.id
  }, function (err) {
    res.send({
      msg: 'Your account has been permanently deleted.'
    });
  });
};

/**
 * GET /unlink/:provider
 */
exports.unlink = (req, res, next) => {
  base.User.findById(req.user.id, function (err, user) {
    switch (req.params.provider) {
      case 'facebook':
        user.facebook = undefined;
        break;
      case 'google':
        user.google = undefined;
        break;
      case 'twitter':
        user.twitter = undefined;
        break;
      case 'vk':
        user.vk = undefined;
        break;
      default:
        return res.status(400).send({
          msg: 'Invalid OAuth Provider'
        });
    }
    user.save(function (err) {
      res.send({
        msg: 'Your account has been unlinked.'
      });
    });
  });
};

/**
 * POST /forgot
 */
exports.forgotPost = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('email', 'Email cannot be blank').notEmpty();
  req.sanitize('email').normalizeEmail({
    remove_dots: false
  });

  var errors = req.validationErrors();

  if (errors) {
    return res.status(400).send(errors);
  }

  async.waterfall([
    function (done) {
      crypto.randomBytes(16, function (err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function (token, done) {
      base.User.findOne({
        email: req.body.email
      }, function (err, user) {
        if (!user) {
          return res.status(400).send({
            msg: 'The email address ' + req.body.email + ' is not associated with any account.'
          });
        }
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // expire in 1 hour
        user.save(function (err) {
          done(err, token, user);
        });
      });
    },
    function (token, user, done) {
      var transporter = nodemailer.createTransport({
        service: 'Mailgun',
        auth: {
          user: process.env.MAILGUN_USERNAME,
          pass: process.env.MAILGUN_PASSWORD
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'support@yourdomain.com',
        subject: '✔ Reset your password on Mega Boilerplate',
        text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      transporter.sendMail(mailOptions, function (err) {
        res.send({
          msg: 'An email has been sent to ' + user.email + ' with further instructions.'
        });
        done(err);
      });
    }
  ]);
};

/**
 * POST /reset
 */
exports.resetPost = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirm', 'Passwords must match').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    return res.status(400).send(errors);
  }

  async.waterfall([
    function (done) {
      base.User.findOne({
        passwordResetToken: req.params.token
      })
        .where('passwordResetExpires').gt(Date.now())
        .exec(function (err, user) {
          if (!user) {
            return res.status(400).send({
              msg: 'Password reset token is invalid or has expired.'
            });
          }
          user.password = req.body.password;
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;
          user.save(function (err) {
            done(err, user);
          });
        });
    },
    function (user, done) {
      var transporter = nodemailer.createTransport({
        service: 'Mailgun',
        auth: {
          user: process.env.MAILGUN_USERNAME,
          pass: process.env.MAILGUN_PASSWORD
        }
      });
      var mailOptions = {
        from: 'support@yourdomain.com',
        to: user.email,
        subject: 'Your Mega Boilerplate password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      transporter.sendMail(mailOptions, function (err) {
        res.send({
          msg: 'Your password has been changed successfully.'
        });
      });
    }
  ]);
};

/**
 * POST /auth/facebook
 * Sign in with Facebook
 */
exports.authFacebook = function (req, res) {
  var profileFields = ['id', 'name', 'email', 'gender', 'location'];
  var accessTokenUrl = 'https://graph.facebook.com/v2.5/oauth/access_token';
  var graphApiUrl = 'https://graph.facebook.com/v2.5/me?fields=' + profileFields.join(',');

  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: process.env.FACEBOOK_SECRET,
    redirect_uri: req.body.redirectUri
  };

  // Step 1. Exchange authorization code for access token.
  request.get({
    url: accessTokenUrl,
    qs: params,
    json: true
  }, function (err, response, accessToken) {
    if (accessToken.error) {
      return res.status(500).send({
        msg: accessToken.error.message
      });
    }

    // Step 2. Retrieve user's profile information.
    request.get({
      url: graphApiUrl,
      qs: accessToken,
      json: true
    }, function (err, response, profile) {
      if (profile.error) {
        return res.status(500).send({
          msg: profile.error.message
        });
      }

      // Step 3a. Link accounts if user is authenticated.
      if (req.isAuthenticated()) {
        base.User.findOne({
          facebook: profile.id
        }, function (err, user) {
          if (user) {
            return res.status(409).send({
              msg: 'There is already an existing account linked with Facebook that belongs to you.'
            });
          }
          user = req.user;
          user.name = user.name || profile.name;
          user.gender = user.gender || profile.gender;
          user.picture = user.picture || 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
          user.facebook = profile.id;
          user.save(function () {
            res.send({
              token: generateToken(user),
              user: user
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        base.User.findOne({
          facebook: profile.id
        }, function (err, user) {
          if (user) {
            return res.send({
              token: generateToken(user),
              user: user
            });
          }
          base.User.findOne({
            email: profile.email
          }, function (err, user) {
            if (user) {
              return res.status(400).send({
                msg: user.email + ' is already associated with another account.'
              });
            }
            user = new base.User({
              name: profile.name,
              email: profile.email,
              gender: profile.gender,
              location: profile.location && profile.location.name,
              picture: 'https://graph.facebook.com/' + profile.id + '/picture?type=large',
              facebook: profile.id
            });
            user.save(function (err) {
              return res.send({
                token: generateToken(user),
                user: user
              });
            });
          });
        });
      }
    });
  });
};

exports.authFacebookCallback = function (req, res) {
  res.send('Loading...');
};
/**
 * POST /auth/google
 * Sign in with Google
 */
exports.authGoogle = function (req, res) {
  var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
  var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';

  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: process.env.GOOGLE_SECRET,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, {
    json: true,
    form: params
  }, function (err, response, token) {
    var accessToken = token.access_token;
    var headers = {
      Authorization: 'Bearer ' + accessToken
    };

    // Step 2. Retrieve user's profile information.
    request.get({
      url: peopleApiUrl,
      headers: headers,
      json: true
    }, function (err, response, profile) {
      if (profile.error) {
        return res.status(500).send({
          message: profile.error.message
        });
      }
      // Step 3a. Link accounts if user is authenticated.
      if (req.isAuthenticated()) {
        base.User.findOne({
          google: profile.sub
        }, function (err, user) {
          if (user) {
            return res.status(409).send({
              msg: 'There is already an existing account linked with Google that belongs to you.'
            });
          }
          user = req.user;
          user.name = user.name || profile.name;
          user.gender = profile.gender;
          user.picture = user.picture || profile.picture.replace('sz=50', 'sz=200');
          user.location = user.location || profile.location;
          user.google = profile.sub;
          user.save(function () {
            res.send({
              token: generateToken(user),
              user: user
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        base.User.findOne({
          google: profile.sub
        }, function (err, user) {
          if (user) {
            return res.send({
              token: generateToken(user),
              user: user
            });
          }
          user = new base.User({
            name: profile.name,
            email: profile.email,
            gender: profile.gender,
            picture: profile.picture.replace('sz=50', 'sz=200'),
            location: profile.location,
            google: profile.sub
          });
          user.save(function (err) {
            res.send({
              token: generateToken(user),
              user: user
            });
          });
        });
      }
    });
  });
};

exports.authGoogleCallback = function (req, res) {
  res.send('Loading...');
};