var config = {
  cstring: process.env.DATABASE_URL || ''
};

config.update = function(opts) {
  for(var k in opts) config[k] = opts[k];
  if (config.db) {
    var db = config.db;
    config.cstring = 'postgres://' + db.host + '/' + db.database;
  }
};

module.exports = config;
