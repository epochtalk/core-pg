var watchlist = {};
module.exports = watchlist;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));

watchlist.all = function(userId, opts) {
  userId = helper.deslugify(userId);

  opts = opts || {};
  opts.limit = opts.limit || 25;
  opts.page = opts.page || 1;
  opts.offset = (opts.page * opts.limit) - opts.limit;
  opts.limit += 1; // hasMoreThreads check

  return watchBoardCount(userId)
  .then(function(count) {
    if (count < 1) { return listThreads(userId, opts); }
    else { return listThreadsAndBoards(userId, opts); }
  })
  .then(helper.slugify);
};

watchlist.unread = function(userId, opts) {
  userId = helper.deslugify(userId);

  opts = opts || {};
  opts.limit = opts.limit || 25;
  opts.page = opts.page || 1;
  opts.offset = (opts.page * opts.limit) - opts.limit;
  opts.limit += 1; // hasMoreThreads check

  return watchBoardCount(userId)
  .then(function(count) {
    if (count < 1) { return unreadThreads(userId, opts); }
    else { return unreadThreadsAndBoards(userId, opts); }
  })
  .then(helper.slugify);
};

watchlist.userWatchThreads = function(userId, opts) {
  userId = helper.deslugify(userId);

  opts = opts || {};
  opts.limit = opts.limit || 25;
  opts.page = opts.page || 1;
  opts.offset = (opts.page * opts.limit) - opts.limit;
  opts.limit += 1; // hasMore check

  var q = 'SELECT t.id, t.post_count, mt.views as view_count, b.name as board_name, ';
  q += '( SELECT title FROM posts WHERE thread_id = wt.thread_id ORDER BY created_at LIMIT 1 ) as title ';
  q += 'FROM users.watch_threads wt ';
  q += 'LEFT JOIN threads t ON wt.thread_id = t.id ';
  q += 'LEFT JOIN metadata.threads mt ON wt.thread_id = mt.thread_id ';
  q += 'LEFT JOIN boards b ON t.board_id = b.id ';
  q += 'WHERE wt.user_id = $1 LIMIT $2 OFFSET $3';
  return db.sqlQuery(q, [userId, opts.limit, opts.offset])
  .then(helper.slugify);
};

watchlist.userWatchBoards = function(userId, opts) {
  userId = helper.deslugify(userId);

  opts = opts || {};
  opts.limit = opts.limit || 25;
  opts.page = opts.page || 1;
  opts.offset = (opts.page * opts.limit) - opts.limit;
  opts.limit += 1; // hasMore check

  var q = 'SELECT b.id, b.name, b.post_count, b.thread_count  ';
  q += 'FROM users.watch_boards wb ';
  q += 'LEFT JOIN boards b ON wb.board_id = b.id ';
  q += 'WHERE user_id = $1 ';
  q += 'LIMIT $2 OFFSET $3';
  return db.sqlQuery(q, [userId, opts.limit, opts.offset])
  .then(helper.slugify);
};

watchlist.watchThread = function(userId, threadId) {
  userId = helper.deslugify(userId);
  threadId = helper.deslugify(threadId);
  var q = 'INSERT INTO users.watch_threads (user_id, thread_id) VALUES ($1, $2)';
  return db.sqlQuery(q, [userId, threadId]);
};

watchlist.unwatchThread = function(userId, threadId) {
  userId = helper.deslugify(userId);
  threadId = helper.deslugify(threadId);
  var q = 'DELETE FROM users.watch_threads WHERE user_id = $1 AND thread_id = $2';
  return db.sqlQuery(q, [userId, threadId]);
};

watchlist.watchBoard = function(userId, boardId) {
  userId = helper.deslugify(userId);
  boardId = helper.deslugify(boardId);
  var q = 'INSERT INTO users.watch_boards (user_id, board_id) VALUES ($1, $2)';
  return db.sqlQuery(q, [userId, boardId]);
};

watchlist.unwatchBoard = function(userId, boardId) {
  userId = helper.deslugify(userId);
  boardId = helper.deslugify(boardId);
  var q = 'DELETE FROM users.watch_boards WHERE user_id = $1 AND board_id = $2';
  return db.sqlQuery(q, [userId, boardId]);
};

/* Functions split out for readability */
function watchBoardCount(userId) {
  var q = 'SELECT count(*) FROM users.watch_boards WHERE user_id = $1';
  return db.sqlQuery(q, [userId])
  .then(function(rows) { return rows[0].count; });
}

function listThreads(userId, opts) {
  var q = 'SELECT tlist.id, t.locked, t.sticky, t.created_at, t.updated_at, t.views as view_count, t.post_count, p.title, p.user_id, p.username, p.user_deleted, t.time AS last_viewed, tv.id AS post_id, tv.position AS post_position, pl.last_post_id, pl.position AS last_post_position, pl.created_at AS last_post_created_at, pl.deleted AS last_post_deleted, pl.id AS last_post_user_id, pl.username AS last_post_username, pl.user_deleted AS last_post_user_deleted ';
  q += 'FROM ( ';
  q += 'SELECT t.id ';
  q += 'FROM users.watch_threads wt ';
  q += 'LEFT JOIN threads t ON wt.thread_id = t.id ';
  q += 'WHERE wt.user_id = $1 ';
  q += 'AND wt.thread_id = t.id ';
  q += 'AND t.updated_at IS NOT NULL ';
  q += 'ORDER BY t.updated_at DESC LIMIT $2 OFFSET $3 ';
  q += ') tlist LEFT JOIN LATERAL ( ';
  q += 'SELECT t1.locked, t1.sticky, t1.post_count, t1.created_at, t1.updated_at, mt.views, ';
  q += '(SELECT time FROM users.thread_views WHERE thread_id = tlist.id AND user_id = $1) ';
  q += 'FROM threads t1 LEFT JOIN metadata.threads mt ON tlist.id = mt.thread_id ';
  q += 'WHERE t1.id = tlist.id ';
  q += ') t ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT p1.title, p1.user_id, u.username, u.deleted as user_deleted ';
  q += 'FROM posts p1 LEFT JOIN users u ON p1.user_id = u.id ';
  q += 'WHERE p1.thread_id = tlist.id ORDER BY p1.created_at LIMIT 1';
  q += ') p ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT id, position FROM posts WHERE thread_id = tlist.id AND created_at >= t.time ORDER BY created_at LIMIT 1 ';
  q += ') tv ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT p.id AS last_post_id, p.position, p.created_at, p.deleted, u.id, u.username, u.deleted as user_deleted FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.thread_id = tlist.id ORDER BY p.created_at DESC LIMIT 1 ';
  q += ') pl ON true';
  return db.sqlQuery(q, [userId, opts.limit, opts.offset])
  .then(function(threads) {
    // format thead output
    return Promise.map(threads, function(thread) {
      return formatThread(thread, userId);
    });
  });
}

function listThreadsAndBoards(userId, opts) {
  var q = 'SELECT tlist.id, t.locked, t.sticky, t.created_at, t.updated_at, t.views as view_count, t.post_count, p.title, p.user_id, p.username, p.user_deleted, t.time AS last_viewed, tv.id AS post_id, tv.position AS post_position, pl.last_post_id, pl.position AS last_post_position, pl.created_at AS last_post_created_at, pl.deleted AS last_post_deleted, pl.id AS last_post_user_id, pl.username AS last_post_username, pl.user_deleted AS last_post_user_deleted ';
  q += 'FROM ( ';
  q += 'SELECT t.id ';
  q += 'FROM threads t ';
  q += 'WHERE ( ';
  q += 'EXISTS (SELECT 1 FROM users.watch_threads WHERE user_id = $1 AND thread_id = t.id) ';
  q += 'OR EXISTS (SELECT 1 FROM users.watch_boards WHERE user_id = $1 AND board_id = t.board_id) ';
  q += ') AND t.updated_at IS NOT NULL ';
  q += 'ORDER BY t.updated_at DESC LIMIT $2 OFFSET $3 ';
  q += ') tlist LEFT JOIN LATERAL ( ';
  q += 'SELECT t1.locked, t1.sticky, t1.post_count, t1.created_at, t1.updated_at, mt.views, ';
  q += '(SELECT time FROM users.thread_views WHERE thread_id = tlist.id AND user_id = $1) ';
  q += 'FROM threads t1 LEFT JOIN metadata.threads mt ON tlist.id = mt.thread_id ';
  q += 'WHERE t1.id = tlist.id ';
  q += ') t ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT p1.title, p1.user_id, u.username, u.deleted as user_deleted ';
  q += 'FROM posts p1 LEFT JOIN users u ON p1.user_id = u.id ';
  q += 'WHERE p1.thread_id = tlist.id ORDER BY p1.created_at LIMIT 1';
  q += ') p ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT id, position FROM posts WHERE thread_id = tlist.id AND created_at >= t.time ORDER BY created_at LIMIT 1 ';
  q += ') tv ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT p.id AS last_post_id, p.position, p.created_at, p.deleted, u.id, u.username, u.deleted as user_deleted FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.thread_id = tlist.id ORDER BY p.created_at DESC LIMIT 1 ';
  q += ') pl ON true';
  return db.sqlQuery(q, [userId, opts.limit, opts.offset])
  .then(function(threads) {
    // format thead output
    return Promise.map(threads, function(thread) {
      return formatThread(thread, userId);
    });
  });
}

function unreadThreads(userId, opts) {
  var q = 'SELECT tlist.id, t.locked, t.sticky, t.created_at, t.updated_at, t.views as view_count, t.post_count, p.title, p.user_id, p.username, p.user_deleted, t.time AS last_viewed, tv.id AS post_id, tv.position AS post_position, pl.last_post_id, pl.position AS last_post_position, pl.created_at AS last_post_created_at, pl.deleted AS last_post_deleted, pl.id AS last_post_user_id, pl.username AS last_post_username, pl.user_deleted AS last_post_user_deleted ';
  q += 'FROM ( ';
  q += 'SELECT t.id ';
  q += 'FROM users.watch_threads wt ';
  q += 'LEFT JOIN users.thread_views tv ';
  q += 'ON wt.thread_id = tv.thread_id AND wt.user_id = tv.user_id ';
  q += 'LEFT JOIN threads t ON wt.thread_id = t.id ';
  q += 'WHERE wt.user_id = $1 ';
  q += 'AND wt.thread_id = t.id ';
  q += 'AND t.updated_at IS NOT NULL ';
  q += 'AND (t.updated_at >= tv.time OR tv.time IS NULL) ';
  q += 'ORDER BY t.updated_at DESC LIMIT $2 OFFSET $3 ';
  q += ') tlist LEFT JOIN LATERAL ( ';
  q += 'SELECT t1.locked, t1.sticky, t1.post_count, t1.created_at, t1.updated_at, mt.views, ';
  q += '(SELECT time FROM users.thread_views WHERE thread_id = tlist.id AND user_id = $1) ';
  q += 'FROM threads t1 LEFT JOIN metadata.threads mt ON tlist.id = mt.thread_id ';
  q += 'WHERE t1.id = tlist.id ';
  q += ') t ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT p1.title, p1.user_id, u.username, u.deleted as user_deleted ';
  q += 'FROM posts p1 LEFT JOIN users u ON p1.user_id = u.id ';
  q += 'WHERE p1.thread_id = tlist.id ORDER BY p1.created_at LIMIT 1';
  q += ') p ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT id, position FROM posts WHERE thread_id = tlist.id AND created_at >= t.time ORDER BY created_at LIMIT 1 ';
  q += ') tv ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT p.id AS last_post_id, p.position, p.created_at, p.deleted, u.id, u.username, u.deleted as user_deleted FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.thread_id = tlist.id ORDER BY p.created_at DESC LIMIT 1 ';
  q += ') pl ON true';
  return db.sqlQuery(q, [userId, opts.limit, opts.offset])
  .then(function(threads) {
    // format thead output
    return Promise.map(threads, function(thread) {
      return formatThread(thread, userId);
    });
  });
}

function unreadThreadsAndBoards(userId, opts) {
  var q = 'SELECT tlist.id, t.locked, t.sticky, t.created_at, t.updated_at, t.views as view_count, t.post_count, p.title, p.user_id, p.username, p.user_deleted, t.time AS last_viewed, tv.id AS post_id, tv.position AS post_position, pl.last_post_id, pl.position AS last_post_position, pl.created_at AS last_post_created_at, pl.deleted AS last_post_deleted, pl.id AS last_post_user_id, pl.username AS last_post_username, pl.user_deleted AS last_post_user_deleted ';
  q += 'FROM ( ';
  q += 'SELECT id ';
  q += 'FROM threads t ';
  q += 'WHERE EXISTS ( ';
  q += 'SELECT 1 ';
  q += 'FROM users.watch_threads wt ';
  q += 'LEFT JOIN users.thread_views tv ';
  q += 'ON wt.thread_id = tv.thread_id AND wt.user_id = tv.user_id ';
  q += 'WHERE t.id = wt.thread_id ';
  q += 'AND wt.user_id = $1 ';
  q += 'AND t.updated_at IS NOT NULL ';
  q += 'AND (t.updated_at >= tv.time OR tv.time IS NULL) ';
  q += ') OR EXISTS ( ';
  q += 'SELECT 1 ';
  q += 'FROM users.watch_boards wb ';
  q += 'LEFT JOIN users.thread_views tv ';
  q += 'ON t.id = tv.thread_id AND wb.user_id = tv.user_id ';
  q += 'WHERE t.board_id = wb.board_id ';
  q += 'AND wb.user_id = $1 ';
  q += 'AND t.updated_at IS NOT NULL ';
  q += 'AND (t.updated_at >= tv.time OR tv.time IS NULL) ';
  q += ') ';
  q += 'ORDER BY t.updated_at DESC LIMIT $2 OFFSET $3 ';
  q += ') tlist LEFT JOIN LATERAL ( ';
  q += 'SELECT t1.locked, t1.sticky, t1.post_count, t1.created_at, t1.updated_at, mt.views, ';
  q += '(SELECT time FROM users.thread_views WHERE thread_id = tlist.id AND user_id = $1) ';
  q += 'FROM threads t1 LEFT JOIN metadata.threads mt ON tlist.id = mt.thread_id ';
  q += 'WHERE t1.id = tlist.id ';
  q += ') t ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT p1.title, p1.user_id, u.username, u.deleted as user_deleted ';
  q += 'FROM posts p1 LEFT JOIN users u ON p1.user_id = u.id ';
  q += 'WHERE p1.thread_id = tlist.id ORDER BY p1.created_at LIMIT 1';
  q += ') p ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT id, position FROM posts WHERE thread_id = tlist.id AND created_at >= t.time ORDER BY created_at LIMIT 1 ';
  q += ') tv ON true ';
  q += 'LEFT JOIN LATERAL ( ';
  q += 'SELECT p.id AS last_post_id, p.position, p.created_at, p.deleted, u.id, u.username, u.deleted as user_deleted FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.thread_id = tlist.id ORDER BY p.created_at DESC LIMIT 1 ';
  q += ') pl ON true';
  return db.sqlQuery(q, [userId, opts.limit, opts.offset])
  .then(function(threads) {
    // format thead output
    return Promise.map(threads, function(thread) {
      return formatThread(thread, userId);
    });
  });
}

function formatThread(thread, userId) {
  // handle deleted user
  if (thread.user_deleted) {
    thread.user_id = '';
    thread.username = '';
  }

  // format user output
  thread.user = {
    id: thread.user_id,
    username: thread.username,
    deleted: thread.user_deleted
  };
  delete thread.user_id;
  delete thread.username;
  delete thread.user_deleted;

  // format last
  if (userId && !thread.last_viewed) {
    thread.has_new_post = true;
    thread.latest_unread_position = 1;
  }
  else if (userId && userId !== thread.last_post_user_id && thread.last_viewed <= thread.last_post_created_at) {
    thread.has_new_post = true;
    thread.latest_unread_position = thread.post_position;
    thread.latest_unread_post_id = thread.post_id;
  }
  delete thread.post_id;
  delete thread.post_position;
  delete thread.last_viewed;

  // handle last post formatting
  if (thread.last_post_deleted || thread.last_post_user_deleted) {
    thread.last_post_username = 'deleted';
  }
  delete thread.last_post_user_id;
  delete thread.last_post_deleted;
  delete thread.last_post_user_deleted;
  return thread;
}
