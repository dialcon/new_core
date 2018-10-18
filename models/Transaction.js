var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schemaOptions = {
  timestamps: true
};

var transactionSchema = new mongoose.Schema({
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
    query: {},
    update: {},
    rollback: {},
    fields_type: {}
  },
  destination: {
    _id: {
      type: Schema.Types.ObjectId
    },
    module: {
      type: String
    },
    query: {},
    update: {},
    rollback: {},
    fields_type: {}
  },
  callback: {
    type: String,
    trim: true
  },
  callback_status: {
    type: Number
  },
  callback_max_retry: {
    type: Number,
    default: 1
  },
  callback_retry: {
    type: Number,
    default: 0
  }
}, schemaOptions);

transactionSchema.pre('save', function(next) {
  if(this.source.query){
    this.source.query = JSON.stringify(this.source.query);
  }
  if(this.source.update){
    this.source.update = JSON.stringify(this.source.update);
  }
  if(this.source.rollback){
    this.source.rollback = JSON.stringify(this.source.rollback);
  }

  if(this.destination.query){
    this.destination.query = JSON.stringify(this.destination.query);
  }
  if(this.destination.update){
    this.destination.update = JSON.stringify(this.destination.update);
  }
  if(this.destination.rollback){
    this.destination.rollback = JSON.stringify(this.destination.rollback);
  }
  next();
});

transactionSchema.post('init', function(result) {
  if(result.source.query){
    result.source.query = JSON.parse(result.source.query);
  }
  if(result.source.update){
    result.source.update = JSON.parse(result.source.update);
  }
  if(result.source.rollback){
    result.source.rollback = JSON.parse(result.source.rollback);
  }

  if(result.destination.query){
    result.destination.query = JSON.parse(result.destination.query);
  }
  if(result.destination.update){
    result.destination.update = JSON.parse(result.destination.update);
  }
  if(result.destination.rollback){
    result.destination.rollback = JSON.parse(result.destination.rollback);
  }
});

var Transaction = global.mongodb_package.model('Transaction', transactionSchema);

module.exports = Transaction;