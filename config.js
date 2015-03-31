var path = require('path');
var database = require(path.join(__dirname, 'database.json'));
var env = process.env.NODE_ENV || 'test';

var config = {
  cstring: 'postgres://' + database[env].host + '/' + database[env].database
};

config.update = function(opts) {
  for(var k in opts) config[k] = opts[k];
  if (config.db) {
    var db = config.db;
    config.cstring = 'postgres://' + db.host + '/' + db.database;
  }
};

module.exports = config;
