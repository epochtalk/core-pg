var threads = {};
module.exports = threads;

var path = require('path');
var pg = require('pg');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;

threads.import = function(thread) {
  var q = 'INSERT INTO threads(id, board_id, imported_at) VALUES($1, $2, now()) RETURNING id';
  var threadUUID = helper.intToUUID(thread.smf.ID_TOPIC);
  var boardUUID = helper.intToUUID(thread.smf.ID_BOARD);
  var params = [threadUUID, boardUUID];
  return insertPostProcessing(boardUUID, thread.view_count, q, params);
};

threads.create = function(thread) {
  var q = 'INSERT INTO threads(board_id, created_at, updated_at) VALUES ($1, now(), now()) RETURNING id';
  var params = [thread.board_id];
  return insertPostProcessing(thread.board_id, 0, q, params);
};

var insertPostProcessing = function(boardId, views, insertQuery, insertParams) {
  return db.sqlQuery(insertQuery, insertParams)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { return Promise.reject(); }
  })
  // initialize thread metadata
  .then(function(insertedThread) {
    var q = 'INSERT INTO metadata.threads (thread_id, views) VALUES($1, $2);';
    var params = [insertedThread.id, views];
    db.sqlQuery(q, params);
    return insertedThread;
  })
  // increment thread count on board
  .then(function(insertedThread) {
    incrementThreadCount(boardId, true);
    return insertedThread;
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

threads.find = function(id) {
  var columns = 't.id, t.board_id, t.created_at, t.updated_at, t.post_count, p.user_id, p.title, p.username';
  var q1 = 'SELECT t1.id, t1.board_id, t1.created_at, t1.updated_at, mt.post_count FROM threads t1 LEFT JOIN metadata.threads mt ON t1.id = mt.thread_id WHERE t1.id = $1';
  var q2 = 'SELECT p1.user_id, p1.title, u.username FROM posts p1 LEFT JOIN users u on p1.user_id = u.id WHERE p1.thread_id = t.id ORDER BY p1.created_at limit 1';
  var query = 'SELECT ' + columns + ' FROM ( ' + q1 + ') t LEFT JOIN LATERAL ( ' + q2 + ' ) p ON true';

  var params = [id];
  return db.sqlQuery(query, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Thread not found'); }
  })
  .then(function(dbThread) {
    dbThread.user = { id: dbThread.user_id, username: dbThread.username };
    delete dbThread.user_id;
    delete dbThread.username;
    return dbThread;
  });
};

threads.byBoard = function(boardId, opts) {
  var columns = 'tlist.id, t.created_at, t.updated_at, t.views as view_count, t.post_count, p.title, p.user_id, p.username';
  var q2 = 'SELECT t1.created_at, t1.updated_at, mt.views, mt.post_count FROM threads t1 ' +
    'LEFT JOIN metadata.threads mt ON tlist.id = mt.thread_id WHERE t1.id = tlist.id';
  var q3 = 'SELECT p1.title, p1.user_id, u.username FROM posts p1 LEFT JOIN users u ON p1.user_id = u.id WHERE p1.thread_id = tlist.id ORDER BY p1.created_at LIMIT 1';

  var limit = 10;
  var page = 1;
  var reversed = 'DESC'; // default to DESC
  if (opts && opts.limit) limit = opts.limit;
  if (opts && opts.page) page = opts.page;
  var offset = (page * limit) - limit;

  // get total thread count for this board
  var getBoardSQL = 'SELECT thread_count FROM metadata.boards WHERE board_id = $1';
  var getBoardParams = [boardId];
  return db.scalar(getBoardSQL, getBoardParams)
  .then(function(result) {
    // determine whether to start from the front or back
    var threadCount = result.thread_count;
    if (offset > Math.floor(threadCount / 2)) {
      reversed = '';
      limit = threadCount <= offset + limit ? threadCount - offset : limit;
      offset = threadCount <= offset + limit ? 0 : threadCount - offset - limit;
    }
  })
  // get all related threads
  .then(function() {
    var q1 = 'SELECT id FROM threads WHERE board_id = $1 ORDER BY updated_at ' + reversed +
    ' LIMIT $2 OFFSET $3';
    var query = 'SELECT ' + columns + ' FROM ( ' + q1 + ' ) tlist LEFT JOIN LATERAL ( ' + q2 + ' ) t ON true LEFT JOIN LATERAL ( ' + q3 + ') p ON true';
    var params = [boardId, limit, offset];
    return db.sqlQuery(query, params);
  })
  .then(function(threads) {
    // reverse ordering if backward search
    if (!reversed) { threads.reverse(); }
    // rearrange last post and user properties
    return Promise.map(threads, function(thread) {
      return threadLastPost(thread)
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
  var increment = 'UPDATE metadata.threads SET views = views + 1 WHERE thread_id = $1;';
  var params = [threadId];
  return db.sqlQuery(increment, params);
};
