var threads = {};
module.exports = threads;

var pg = require('pg');
var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var config = require(path.join(__dirname, '..', 'config'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;
var MoveError = Promise.OperationalError;
var DeletionError = Promise.OperationalError;
var using = Promise.using;

/**
 * This has a trigger attached to the threads table that will increment the
 * board's thread count on each new thread. The metadata.threads table also has a
 * trigger to update the board's post_count when metadata.threads's post_count is
 * changed. It also updates the board's last post information.
 */
threads.create = function(thread) {
  thread = helper.deslugify(thread);
  var q, params;
  return using(db.createTransaction(), function(client) {
    q = 'INSERT INTO threads(board_id, locked, sticky, moderated, created_at) VALUES ($1, $2, $3, $4, now()) RETURNING id';
    params = [thread.board_id, thread.locked, thread.sticky, thread.moderated];
    return client.queryAsync(q, params)
    .then(function(results) { thread.id = results.rows[0].id; })
    // insert thread metadata
    .then(function() {
      q = 'INSERT INTO metadata.threads (thread_id, views) VALUES($1, 0);';
      return client.queryAsync(q, [thread.id]);
    });
  })
  .then(function() { return helper.slugify(thread); });
};

threads.breadcrumb = function(threadId) {
  threadId = helper.deslugify(threadId);
  var q = 'SELECT t.board_id, (SELECT title FROM posts WHERE thread_id = t.id ORDER BY created_at LIMIT 1) as title FROM threads t WHERE t.id = $1';
  return db.sqlQuery(q, [threadId])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { return {}; }
  })
  .then(helper.slugify);
};

threads.find = function(id) {
  id = helper.deslugify(id);
  var columns = 't.id, t.board_id, t.locked, t.sticky, t.moderated, t.created_at, t.updated_at, t.post_count, p.user_id, p.title, p.username, p.user_deleted';
  var q1 = 'SELECT id, board_id, locked, sticky, moderated, post_count, created_at, updated_at FROM threads WHERE id = $1';
  var q2 = 'SELECT p1.user_id, p1.title, u.username, u.deleted as user_deleted FROM posts p1 LEFT JOIN users u on p1.user_id = u.id WHERE p1.thread_id = t.id ORDER BY p1.created_at limit 1';
  var query = 'SELECT ' + columns + ' FROM ( ' + q1 + ') t LEFT JOIN LATERAL ( ' + q2 + ' ) p ON true';

  var params = [id];
  return db.sqlQuery(query, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Thread Not Found'); }
  })
  .then(formatThread)
  .then(helper.slugify);
};

threads.byBoard = function(boardId, userId, opts) {
  boardId = helper.deslugify(boardId);
  userId = helper.deslugify(userId || undefined);

  opts = opts || {};
  opts.limit = opts.limit || 25;
  opts.page = opts.page || 1;
  opts.offset = (opts.page * opts.limit) - opts.limit;
  opts.reversed = 'DESC';
  opts.columns = 'tlist.id, t.locked, t.sticky, t.moderated, t.poll, t.created_at, t.updated_at, t.views as view_count, t.post_count, p.title, p.user_id, p.username, p.user_deleted, t.time AS last_viewed, tv.id AS post_id, tv.position AS post_position, pl.last_post_id, pl.position AS last_post_position, pl.created_at AS last_post_created_at, pl.deleted AS last_post_deleted, pl.id AS last_post_user_id, pl.username AS last_post_username, pl.user_deleted AS last_post_user_deleted ';
  opts.q2 = 'SELECT t1.locked, t1.sticky, t1.moderated, t1.post_count, t1.created_at, t1.updated_at, mt.views, ' +
    '(SELECT EXISTS ( SELECT 1 FROM polls WHERE thread_id = tlist.id )) as poll, ' +
    '(SELECT time FROM users.thread_views WHERE thread_id = tlist.id AND user_id = $2) ' +
    'FROM threads t1 ' +
    'LEFT JOIN metadata.threads mt ON tlist.id = mt.thread_id ' +
    'WHERE t1.id = tlist.id';
  opts.q3 = 'SELECT p1.title, p1.user_id, u.username, u.deleted as user_deleted FROM posts p1 LEFT JOIN users u ON p1.user_id = u.id WHERE p1.thread_id = tlist.id ORDER BY p1.created_at LIMIT 1';
  opts.q4 = 'SELECT id, position FROM posts WHERE thread_id = tlist.id AND created_at >= t.time ORDER BY created_at LIMIT 1';
  opts.q5 = 'SELECT p.id AS last_post_id, p.position, p.created_at, p.deleted, u.id, u.username, u.deleted as user_deleted FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.thread_id = tlist.id ORDER BY p.created_at DESC LIMIT 1';

  var stickyThreads = getStickyThreads(boardId, userId, opts);
  var normalThreads = getNormalThreads(boardId, userId, opts);

  return Promise.join(stickyThreads, normalThreads, function(sticky, normal) {
    return { normal: normal, sticky: sticky };
  })
  .then(helper.slugify);
};

var getNormalThreads = function(boardId, userId, opts) {
  var getBoardSQL = 'SELECT thread_count FROM boards WHERE id = $1';
  return db.scalar(getBoardSQL, [boardId])
  .then(function(result) {
    if (result) {
      // determine whether to start from the front or back
      var threadCount = result.thread_count;
      if (opts.offset > Math.floor(threadCount / 2)) {
        opts.reversed = '';
        opts.limit = threadCount <= opts.offset + opts.limit ? threadCount - opts.offset : opts.limit;
        opts.offset = threadCount <= opts.offset + opts.limit ? 0 : threadCount - opts.offset - opts.limit;
      }
    }
  })
  // get all related threads
  .then(function() {
    var query = 'SELECT ' + opts.columns + ' FROM ( SELECT id FROM threads WHERE board_id = $1 AND sticky = False ORDER BY updated_at ' + opts.reversed + ' LIMIT $3 OFFSET $4 ) tlist LEFT JOIN LATERAL ( ' + opts.q2 + ' ) t ON true LEFT JOIN LATERAL ( ' + opts.q3 + ' ) p ON true LEFT JOIN LATERAL ( ' + opts.q4 + ' ) tv ON true LEFT JOIN LATERAL ( ' + opts.q5 + ' ) pl ON true';
    var params = [boardId, userId, opts.limit, opts.offset];
    return db.sqlQuery(query, params);
  })
  .then(function(threads) {
    // reverse ordering if backward search
    if (!opts.reversed) { threads.reverse(); }
    // rearrange last post and user properties
    return Promise.map(threads, function(thread) {
      return formatThread(thread, userId);
    });
  });
};

var getStickyThreads = function(boardId, userId, opts) {
  if (opts.page !== 1) { return []; }
  var query = 'SELECT ' + opts.columns + ' FROM ( SELECT id FROM threads WHERE board_id = $1 AND sticky = True ORDER BY updated_at DESC ) tlist LEFT JOIN LATERAL ( ' + opts.q2 + ' ) t ON true LEFT JOIN LATERAL ( ' + opts.q3 + ' ) p ON true LEFT JOIN LATERAL ( ' + opts.q4 + ' ) tv ON true LEFT JOIN LATERAL (' + opts.q5 + ' ) pl ON true';
  return db.sqlQuery(query, [boardId, userId])
  .map(function(thread) { return formatThread(thread, userId); });
};

threads.recent = function(user_id, opts) {
  userId = helper.deslugify(user_id || undefined);

  opts = opts || {};
  opts.limit = opts.limit || 25;
  opts.page = opts.page || 1;
  opts.offset = (opts.page * opts.limit) - opts.limit;
  opts.columns = 'tlist.id, t.locked, t.sticky, t.created_at, t.updated_at, t.views as view_count, t.post_count, p.title, p.user_id, p.username, p.user_deleted, t.time AS last_viewed, tv.id AS post_id, tv.position AS post_position, pl.last_post_id, pl.position AS last_post_position, pl.created_at AS last_post_created_at, pl.deleted AS last_post_deleted, pl.id AS last_post_user_id, pl.username AS last_post_username, pl.user_deleted AS last_post_user_deleted ';
  opts.q2 = 'SELECT t1.locked, t1.sticky, t1.post_count, t1.created_at, t1.updated_at, mt.views, ' +
    '(SELECT time FROM users.thread_views WHERE thread_id = tlist.id AND user_id = $1) ' +
    'FROM threads t1 ' +
    'LEFT JOIN metadata.threads mt ON tlist.id = mt.thread_id ' +
    'WHERE t1.id = tlist.id';
  opts.q3 = 'SELECT p1.title, p1.user_id, u.username, u.deleted as user_deleted FROM posts p1 LEFT JOIN users u ON p1.user_id = u.id WHERE p1.thread_id = tlist.id ORDER BY p1.created_at LIMIT 1';
  opts.q4 = 'SELECT id, position FROM posts WHERE thread_id = tlist.id AND created_at >= t.time ORDER BY created_at LIMIT 1';
  opts.q5 = 'SELECT p.id AS last_post_id, p.position, p.created_at, p.deleted, u.id, u.username, u.deleted as user_deleted FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.thread_id = tlist.id ORDER BY p.created_at DESC LIMIT 1';

  // get all related threads
  var query = 'SELECT ' + opts.columns + ' FROM ( SELECT t.id FROM threads t WHERE EXISTS ( SELECT 1 FROM board_mapping bm WHERE bm.board_id = t.board_id ) ORDER BY t.updated_at DESC LIMIT $2 OFFSET $3 ) tlist LEFT JOIN LATERAL ( ' + opts.q2 + ' ) t ON true LEFT JOIN LATERAL ( ' + opts.q3 + ' ) p ON true LEFT JOIN LATERAL ( ' + opts.q4 + ' ) tv ON true LEFT JOIN LATERAL ( ' + opts.q5 + ' ) pl ON true';
  var params = [userId, opts.limit, opts.offset];
  return db.sqlQuery(query, params)
  .then(helper.slugify);
};

var formatThread = function(thread, userId) {
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
};

threads.incViewCount = function(threadId) {
  threadId = helper.deslugify(threadId);
  var increment = 'UPDATE metadata.threads SET views = views + 1 WHERE thread_id = $1';
  return db.sqlQuery(increment, [threadId]);
};

threads.lock = function(threadId, locked) {
  threadId = helper.deslugify(threadId);
  var lock = 'UPDATE threads SET locked = $1 WHERE id = $2;';
  return db.sqlQuery(lock, [locked, threadId]);
};

threads.sticky = function(threadId, sticky) {
  threadId = helper.deslugify(threadId);
  var stick = 'UPDATE threads SET sticky = $1 WHERE id = $2;';
  return db.sqlQuery(stick, [sticky, threadId]);
};

threads.move = function(threadId, newBoardId) {
  threadId = helper.deslugify(threadId);
  newBoardId = helper.deslugify(newBoardId);
  var q, params;
  var thread, threadMeta;
  var oldBoard, newBoard;
  return using(db.createTransaction(), function(client) {
    // lock thread/Meta row
    params = [threadId];
    q = 'SELECT * FROM threads t JOIN metadata.threads mt ON mt.thread_id = t.id WHERE t.id = $1 FOR UPDATE';
    return client.queryAsync(q, params)
    .then(function(results) {
      if (results.rows.length > 0) { thread = results.rows[0]; }
      else { throw new NotFoundError('Thread Not Found'); }
    })
    .then(function() {
      if (thread.board_id === newBoardId) {
        throw new MoveError('New Board Id matches current Board Id');
      }
    })
    // lock thread's current board/Meta row
    .then(function() {
      params = [thread.board_id];
      q = 'SELECT * FROM boards b JOIN metadata.boards mb ON mb.board_id = b.id WHERE b.id = $1 FOR UPDATE';
      return client.queryAsync(q, params)
      .then(function(results) { oldBoard = results.rows[0]; });
    })
    // lock thread's new board/Meta row
    .then(function() {
      params = [newBoardId];
      q = 'SELECT * FROM boards b JOIN metadata.boards mb ON mb.board_id = b.id WHERE b.id = $1 FOR UPDATE';
      return client.queryAsync(q, params)
      .then(function(results) { newBoard = results.rows[0]; });
    })
    // update thread's current board metadata row
    .then(function() {
      params = [thread.post_count, oldBoard.board_id];
      q = 'UPDATE boards SET (thread_count, post_count) = (thread_count - 1, post_count - $1) WHERE id = $2';
      return client.queryAsync(q, params);
    })
    // update thread's new board metadata row
    .then(function() {
      params = [thread.post_count, newBoard.board_id];
      q = 'UPDATE boards SET (thread_count, post_count) = (thread_count + 1, post_count + $1) WHERE id = $2';
      return client.queryAsync(q, params);
    })
    // update thread's board_id with new board id
    .then(function() {
      params = [newBoardId, threadId];
      q = 'UPDATE threads SET board_id = $1 WHERE id = $2';
      return client.queryAsync(q, params);
    });
  }); // Promise disposer called at this point
};

threads.getThreadFirstPost = function(threadId) {
  threadId = helper.deslugify(threadId);
  var q = 'SELECT id, title, body, raw_body, thread_id FROM posts WHERE thread_id = $1 ORDER BY created_at LIMIT 1';
  return db.sqlQuery(q, [threadId])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { return new NotFoundError('Thread Not Found'); }
  })
  .then(helper.slugify);
};

threads.getThreadsBoardInBoardMapping = function(threadId, userPriority) {
  threadId = helper.deslugify(threadId);
  var q = 'SELECT board_id FROM threads WHERE id = $1';
  return db.sqlQuery(q, [threadId])
  .then(function(rows) {
    if (rows.length > 0 ) { return rows[0].board_id; }
    else { throw new NotFoundError(); }
  })
  .then(function(boardId) {
    var q = 'WITH RECURSIVE find_parent(board_id, parent_id, category_id) AS ( ';
    q += 'SELECT bm.board_id, bm.parent_id, bm.category_id ';
    q += 'FROM board_mapping bm where board_id = $1 ';
    q += 'UNION ';
    q += 'SELECT bm.board_id, bm.parent_id, bm.category_id ';
    q += 'FROM board_mapping bm, find_parent fp ';
    q += 'WHERE bm.board_id = fp.parent_id ';
    q += ') ';
    q += 'SELECT fp.board_id, fp.parent_id, fp.category_id, b.viewable_by as board_viewable, c.viewable_by as cat_viewable ';
    q += 'FROM find_parent fp ';
    q += 'LEFT JOIN boards b on fp.board_id = b.id ';
    q += 'LEFT JOIN categories c on fp.category_id = c.id';
    return db.sqlQuery(q, [boardId])
    .then(function(rows) {
      if (rows.length < 1) { return false; }

      var boardVisible = false;
      var catVisible = false;
      var board_viewable = rows[0].board_viewable;
      var cat_viewable = rows[rows.length - 1].cat_viewable;

      if (board_viewable !== 0 && !board_viewable) { boardVisible = true; }
      else if (userPriority <= board_viewable) { boardVisible = true; }

      if (cat_viewable !== 0 && !cat_viewable) { catVisible = true; }
      else if (userPriority <= cat_viewable) { catVisible = true; }

      return boardVisible && catVisible;
    });
  })
  .error(function() { return false; });
};

threads.getThreadOwner = function(threadId) {
  threadId = helper.deslugify(threadId);
  var q = 'SELECT user_id FROM posts WHERE thread_id = $1 ORDER BY created_at DESC LIMIT 1';
  return db.sqlQuery(q, [threadId])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Thread Not Found'); }
  })
  .then(helper.slugify);
};

/**
 * This sets off a trigger that updates the metadata.boards' thread_count and
 * post_count accordingly. It also updates the metadata.boards' last post
 * information.
 */
threads.purge = function(threadId) {
  threadId = helper.deslugify(threadId);
  var q;

  return using(db.createTransaction(), function(client) {
    // lock up thread and Meta
    q = 'DELETE FROM threads WHERE id = $1';
    return client.queryAsync(q, [threadId]);
  });
};

threads.watching = function(threadId, userId) {
  threadId = helper.deslugify(threadId);
  userId = helper.deslugify(userId);

  var q = 'SELECT thread_id FROM users.watch_threads WHERE thread_id = $1 AND user_id = $2';
  return db.sqlQuery(q, [threadId, userId])
  .then(function(rows) {
    if (rows.length > 0) { return true; }
    else { return false; }
  });
};
