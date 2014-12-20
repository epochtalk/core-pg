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
  var insertThreadQuery = 'INSERT INTO threads(id, board_id, imported_at) VALUES($1, $2, $3) RETURNING id';
  var params = [thread.smf.ID_TOPIC, thread.smf.ID_BOARD, thread.imported_at];
  return db.sqlQuery(insertThreadQuery, params)
  .then(function(rows) {
    if (rows.length > 0) {
      return rows[0];
    }
  });
};

var threadCountPosts = function(thread) {
  var q = 'SELECT count(id) FROM posts WHERE thread_id = $1';
  var params = [thread.id];
  return db.sqlQuery(q, params);
};

threads.find = function(id) {
  var q = 'SELECT DISTINCT ON(t.id) t.id, t.board_id, t.created_at, t.updated_at, p.user_id, p.title, u.username FROM threads t LEFT JOIN posts p on t.id = p.thread_id LEFT JOIN users u ON p.user_id = u.id WHERE t.id = $1 ORDER BY t.id DESC';
  var params = [id];
  var thread;
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) return rows[0];
    else Promise.resolve();
  })
  .then(function(dbThread) {
    thread = dbThread;
    return dbThread;
  })
  .then(threadCountPosts)
  .then(function(rows) {
    if (rows.length > 0) {
      var postCount = Number(rows[0].count);
      thread.post_count = postCount;
    }
    return thread;
  })
  .then(function(thread) {
    thread.user = { id: thread.user_id, username: thread.username };
    delete thread.user_id;
    delete thread.username;
    return thread;
  });
};

threads.byBoard = function(boardId, opts) {
  var q = 'SELECT DISTINCT ON(t.id) t.id, t.created_at, t.updated_at, p.title, p.body, p.user_id, u.username FROM posts p LEFT JOIN threads t ON p.thread_id = t.id LEFT JOIN users u ON p.user_id = u.id WHERE t.board_id = $1 ORDER BY t.id DESC LIMIT $2 OFFSET $3';
  var limit = opts.limit || 10;
  var page = opts.page || 1;
  var offset = (page * limit) - limit;
  var params = [boardId, limit, offset];
  return db.sqlQuery(q, params)
  .then(function(threads) {
    return Promise.map(threads, function(thread) {
      return threadCountPosts(thread)
      .then(function(rows) {
        if (rows.length > 0) {
          var postCount = Number(rows[0].count);
          thread.post_count = postCount;
        }
        return thread;
      })
      .then(function(thread) {
        thread.user = { id: thread.user_id, username: thread.username };
        delete thread.user_id;
        delete thread.username;
        return thread;
      });
    });
  });
};

threads.incViewCount = function(threadId) {
  console.log('STUB: inc view count');
};
