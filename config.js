var config = {};

config.update = function(opts) {
  for(var k in opts) config[k] = opts[k];
  if (config.db) {
    var db = config.db;
    if (db.cstring) {
      config.cstring = db.cstring;
    }
    else {
      var credentials = '';
      var port = '';
      if (db.username && db.password) {
        credentials = db.username + ':' + db.password + '@';
      }
      if (db.port) {
        port = ':' + db.port;
      }
      config.cstring = 'postgres://' + credentials + db.host + port + '/' + db.database;
    }
  }
};

module.exports = config;
