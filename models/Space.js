var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schemaOptions = {
  timestamps: true
};

var spaceSchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  modules: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    module_type: {
      type: String,
      enum: ['user', 'general', 'gps']
    },
    new: {
      type: Boolean,
      default: true,
      index: true
    },
    fields: {},
    fields_type: {},
    keys: {},
    active: {
      type: Boolean,
      default: true
    }
  }],
  states_machines: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    states: [{
      name: {
        type: String,
        trim: true
      },
      next_state: [String]
    }]
  }],
  active: {
    type: Boolean,
    default: true,
    index: true
  }
}, schemaOptions);

var Space = global.mongodb_package.model('Space', spaceSchema);

module.exports = Space;
