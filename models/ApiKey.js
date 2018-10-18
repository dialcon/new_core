var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schemaOptions = {
  timestamps: true
};

var apikeySchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true
  },
  space: {
    type: Schema.Types.ObjectId,
    ref: 'Space',
    index: true,
    required: true
  },
  keys: [{
    key: {
      type: String,
      index: true
    },
    secret: {
      type: String
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    name: String
  }]
}, schemaOptions);

var ApiKey = global.mongodb_package.model('ApiKey', apikeySchema);

module.exports = ApiKey;
