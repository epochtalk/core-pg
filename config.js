var config = {
  cstring: process.env.DATABASE_URL || ''
};

config.update = function(opts) {
  for(var k in opts) config[k] = opts[k];
  if (config.db) {
    var db = config.db;
    var credentials = '';
    if (db.username && db.password) {
      credentials = db.username + ':' + db.password + '@';
    }
    config.cstring = 'postgres://' + credentials + db.host + '/' + db.database;
  }
};

module.exports = config;
