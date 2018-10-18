var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schemaOptions = {
  timestamps: true
};

var actionSchema = new mongoose.Schema({
  space: {
    type: Schema.Types.ObjectId,
    ref: 'Space',
    index: true,
    required: true
  },
  state: {
    type: String,
    index: true,
    trim: true,
    default: 'initial'
  },
  source: {
    _id: {
      type: Schema.Types.ObjectId
    },
    module: {
      type: String
    },
    query: {
      type: String
    },
    fields_type: {}
  },
  action: {
    url: {
      type: String,
      trim: true
    },
    method: {
      type: String,
      trim: true,
      enum: ['get', 'post', 'put']
    },
    qs: {},
    body: {}
  },
  callback: {
    type: String,
    trim: true
  },
  callback_status: {
    type: Number
  }
}, schemaOptions);

var Action = global.mongodb_package.model('Action', actionSchema);

module.exports = Action;