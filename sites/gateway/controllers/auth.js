'use strict';
module.exports = (req, res, next) => {
  var token = req.body.token || req.params.token || req.query.token || req.headers.token;
  var key = req.body.apikey || req.params.apikey || req.query.apikey || req.headers.apikey;

  if (token && key) {
    // valida que el token
    if (req.isAuthenticated()) {
      next();
    } else {
      res.status(401).send({
        msg: 'Unauthorized'
      });
    }
  } else {
    res.status(401).send({
      msg: 'Unauthorized'
    });
  }
};
