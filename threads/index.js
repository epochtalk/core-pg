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
  var insertThreadQuery = 'INSERT INTO threads(imported_at, smf_id_topic, smf_id_board) VALUES($1, $2, $3) RETURNING id';
  var params = [thread.imported_at, thread.smf.ID_TOPIC, thread.smf.ID_BOARD];
  return db.sqlQuery(insertThreadQuery, params)
  .then(function(rows) {
    if (rows.length > 0) {
      return rows[0];
    }
  });
};

threads.find = function(id) {
  var q = 'SELECT * FROM threads WHERE id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      return rows[0];
    }
  });
};

threads.byBoard = function(boardId, opts) {
  var q = 'SELECT * FROM threads t, posts p WHERE board_id = $1 AND p.thread_id = t.id';
  var params = [boardId];
  return db.sqlQuery(q, params)
  .then(function(rows) { return rows; });
};

threads.incViewCount = function(threadId) {
  console.log('STUB: inc view count');
};
