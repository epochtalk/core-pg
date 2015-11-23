var dbm = global.dbm || require('db-migrate');
var type = dbm.dataType;
var fs = require('fs');
var path = require('path');

exports.up = function(db, callback) {
  var filePath = path.join(__dirname + '/sqls/20151117235809-polls-up.sql');
  fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
    if (err) return callback(err);

    db.runSql(data, function(err) {
      if (err) return callback(err);
      callback();
    });
  });
};

exports.down = function(db, callback) {
  var filePath = path.join(__dirname + '/sqls/20151117235809-polls-down.sql');
  fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
    if (err) return callback(err);

    db.runSql(data, function(err) {
      if (err) return callback(err);
      callback();
    });
  });
};
