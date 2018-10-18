var enviroment = {
  'cache': 1,
  'db': {
    'mongodb_package': {
      'url': 'mongodb://localhost/package',
      'autoReconnect': true,
      'autoRemove': 'native',
      'autoRemoveInterval': 10
    },

    'mongodb_modules': {
      'url': 'mongodb://localhost/modules',
      'autoReconnect': true,
      'autoRemove': 'native',
      'autoRemoveInterval': 10
    },
    'redis': {
      'url': 'redis://localhost/',
      retry_strategy: function (options) {
        if (options.error.code === 'ECONNREFUSED') {
          return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.times_connected > 10) {
          return undefined;
        }
        return Math.max(options.attempt * 100, 3000);
      }
    }
  },

  'sites': {
    'package': {
      'name': 'package',
      'description': 'Creación de cuentas y sus configuraciones',
      'port': 3043,
      'host': '0.0.0.0'
    },
    'gateway': {
      'name': 'gateway',
      'description': 'Recibe los datos de los espacios de trabajo',
      'port': 3044,
      'host': '0.0.0.0'
    }
  },
  'secret': '03ee19a773831fe78ce8b6f38a49bd6f092daf59a7793d9c244ddb2aba7d9694',
  'errors': {
    'language': 'es'
  }
};
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
  enviroment.cache = 1;
  enviroment.db.mongodb_package.url = process.env.MONGO_URL_PACKAGE || 'mongodb://localhost/package';
  enviroment.db.mongodb_modules.url = process.env.MONGO_URL_MODULES || 'mongodb://localhost/modules';
  enviroment.db.redis.url = process.env.REDIS_URL || 'redis://localhost/';
  enviroment.cron_enabled = process.env.CRON_ENABLED || 'no';
}

module.exports = enviroment;