var threads = {};
module.exports = threads;
var path = require('path');
var pg = require('pg');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));
var db = require(path.join(__dirname, '..', 'db'));
threads.all = function() {
  return db.sqlQuery('SELECT * from threads');
};
threads.import = function(thread) {
  var timestamp = new Date();
  thread.imported_at = timestamp;
  var q = 'INSERT INTO threads(board_id, imported_at) VALUES($1, $2) RETURNING id';
  var params = [thread.board_id, thread.imported_at];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) return rows[0];
  })
  .catch(function(err) {
    console.log(err)
  });
};
