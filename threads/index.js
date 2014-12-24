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
    if (rows.length > 0) { return rows[0]; }
    else { return Promise.reject(); }
  })
  // initialize thread metadata
  .then(function(importThread) {
    // TODO: this should be seeded with the imported view count
    var q = 'INSERT INTO metadata.threads (thread_id, views) VALUES($1, $2);';
    var params = [importThread.id, 1];
    db.sqlQuery(q, params);
    return importThread;
  })
  // increment thread count on board
  .then(function(importThread) {
    incrementThreadCount(thread.smf.ID_BOARD, true);
    return importThread;
  });
};

var incrementThreadCount = function increment(boardId, initial) {
  var inc, params = [boardId];
  if (initial) {
    inc = 'UPDATE metadata.boards SET thread_count = thread_count + 1, total_thread_count = total_thread_count + 1 WHERE board_id = $1';
    db.sqlQuery(inc, params);

  }
  else {
    inc = 'UPDATE metadata.boards SET total_thread_count = total_thread_count + 1 WHERE board_id = $1';
    db.sqlQuery(inc, params);
  }

  // check if theres any parent boards
  var q = 'SELECT parent_board_id from boards WHERE id = $1';
  db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      increment(rows[0].parent_board_id);
    }
  });
};

threads.create = function(thread) {
  var timestamp = new Date();
  var createQuery = 'INSERT INTO threads(board_id, created_at, updated_at) VALUES ($1, $2, $3) RETURNING id';
  var params = [thread.board_id, timestamp, timestamp];
  return db.sqlQuery(createQuery, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(function(createThread) {
    var q = 'INSERT INTO metadata.threads (thread_id, views) VALUES($1, $2);';
    var params = [createThread.id, 1];
    db.sqlQuery(q, params);
    return createThread;
  })
  .then(function(createThread) {
    incrementThreadCount(thread.board_id, true);
    return createThread;
  });
};

var threadCountPosts = function(thread) {
  var q = 'SELECT count(id) FROM posts WHERE thread_id = $1';
  var params = [thread.id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      var postCount = Number(rows[0].count);
      thread.post_count = postCount;
    }
    return thread;
  });
};

var threadLastPost = function(thread) {
  var q = 'SELECT p.created_at, u.username FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.thread_id = $1 ORDER BY p.created_at DESC LIMIT 1';
  var params = [thread.id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      thread.last_post_created_at = rows[0].created_at;
      thread.last_post_username = rows[0].username;
    }
    return thread;
  });
};

var threadViews = function(thread) {
  var q = 'SELECT views FROM metadata.threads WHERE thread_id = $1';
  var params = [thread.id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { thread.view_count = rows[0].views; }
    return thread;
  });
};

threads.find = function(id) {
  var q = 'SELECT DISTINCT ON(t.id) t.id, t.board_id, t.created_at, t.updated_at, p.user_id, p.title, u.username FROM threads t LEFT JOIN posts p on t.id = p.thread_id LEFT JOIN users u ON p.user_id = u.id WHERE t.id = $1 ORDER BY t.id DESC, p.created_at';
  var params = [id];
  var thread;
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) return rows[0];
    else Promise.resolve();
  })
  .then(function(dbThread) {
    dbThread.user = { id: dbThread.user_id, username: dbThread.username };
    delete dbThread.user_id;
    delete dbThread.username;
    thread = dbThread;
    return dbThread;
  })
  .then(threadCountPosts);
};

threads.byBoard = function(boardId, opts) {
  var q = 'SELECT t.id, t.created_at, t.updated_at, p.title, p.user_id, u.username FROM threads t LEFT JOIN ( SELECT DISTINCT ON (thread_id) thread_id, title, user_id from posts order by thread_id, created_at ) p ON t.id = p.thread_id LEFT JOIN users u ON p.user_id = u.id WHERE t.board_id = $1 ORDER BY t.updated_at DESC LIMIT $2 OFFSET $3;';
  var limit = opts.limit || 10;
  var page = opts.page || 1;
  var offset = (page * limit) - limit;
  var params = [boardId, limit, offset];
  return db.sqlQuery(q, params)
  .then(function(threads) {
    return Promise.map(threads, function(thread) {
      thread.user = { id: thread.user_id, username: thread.username };
      delete thread.user_id;
      delete thread.username;
      return threadCountPosts(thread)
      .then(threadLastPost)
      .then(threadViews);
    });
  });
};

threads.incViewCount = function(threadId) {
  var increment = 'UPDATE metadata.threads SET views = views + 1 WHERE thread_id = $1;';
  var params = [threadId];
  return db.sqlQuery(increment, params);
};
