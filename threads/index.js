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
var using = Promise.using;

threads.import = function(thread) {
  // no created_at or updated_at needed, will be set by first post
  thread.id = helper.intToUUID(thread.smf.ID_TOPIC);
  thread.board_id = helper.intToUUID(thread.smf.ID_BOARD);
  thread.locked = thread.locked || false;
  thread.sticky = thread.sticky || false;
  var q, params;
  return using(db.createTransaction(), function(client) {
    q = 'INSERT INTO threads(id, board_id, locked, sticky, imported_at) VALUES($1, $2, $3, $4, now()) RETURNING id';
    params = [thread.id, thread.board_id, thread.locked, thread.sticky];
    return insertPostProcessing(thread, thread.view_count, q, params, client);
  })
  .then(function() { return helper.slugify(thread); });
};

threads.create = function(thread) {
  thread = helper.deslugify(thread);
  var q, params;
  return using(db.createTransaction(), function(client) {
    q = 'INSERT INTO threads(board_id, locked, sticky, created_at) VALUES ($1, $2, $3, now()) RETURNING id';
    params = [thread.board_id, thread.locked, thread.sticky];
    return insertPostProcessing(thread, 0, q, params, client);
  })
  .then(function() { return helper.slugify(thread); });
};

var insertPostProcessing = function(thread, views, q, params, client) {
  // insert thread
  return client.queryAsync(q, params)
  .then(function(results) { thread.id = results.rows[0].id; })
  // insert thread metadata
  .then(function() {
    q = 'INSERT INTO metadata.threads (thread_id, views) VALUES($1, $2);';
    params = [thread.id, views];
    return client.queryAsync(q, params);
  })
  // increment thread count on board
  .then(function() {
    q = 'UPDATE metadata.boards SET thread_count = thread_count + 1 WHERE board_id = $1';
    params = [thread.board_id];
    return client.queryAsync(q, params);
  });
};

var threadLastPost = function(thread) {
  var q = 'SELECT p.created_at, u.username FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.thread_id = $1 AND p.deleted = false ORDER BY p.created_at DESC LIMIT 1';
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
  id = helper.deslugify(id);
  var columns = 't.id, t.board_id, t.locked, t.sticky, t.created_at, t.updated_at, t.post_count, p.user_id, p.title, p.username';
  var q1 = 'SELECT t1.id, t1.board_id, t1.locked, t1.sticky, t1.created_at, t1.updated_at, mt.post_count FROM threads t1 LEFT JOIN metadata.threads mt ON t1.id = mt.thread_id WHERE t1.id = $1';
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
  })
  .then(helper.slugify);
};

threads.deepFind = function(id) {
  id = helper.deslugify(id);
  var columns = 't.id, t.board_id, t.locked, t.sticky, t.deleted, t.created_at, t.updated_at, t.post_count, p.user_id, p.title, p.username';
  var q1 = 'SELECT t1.id, t1.board_id, t1.locked, t1.sticky, t1.deleted, t1.created_at, t1.updated_at, mt.post_count FROM threads t1 LEFT JOIN metadata.threads mt ON t1.id = mt.thread_id WHERE t1.id = $1';
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
  })
  .then(helper.slugify);
};

threads.byBoard = function(boardId, opts) {
  boardId = helper.deslugify(boardId);
  var columns = 'tlist.id, t.locked, t.sticky, t.created_at, t.updated_at, t.views as view_count, t.post_count, p.title, p.user_id, p.username';
  var q2 = 'SELECT t1.locked, t1.sticky, t1.created_at, t1.updated_at, mt.views, mt.post_count FROM threads t1 ' +
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
    if (result) {
      // determine whether to start from the front or back
      var threadCount = result.thread_count;
      if (offset > Math.floor(threadCount / 2)) {
        reversed = '';
        limit = threadCount <= offset + limit ? threadCount - offset : limit;
        offset = threadCount <= offset + limit ? 0 : threadCount - offset - limit;
      }
    }
  })
  // get all related threads
  .then(function() {
    var q1 = 'SELECT id FROM threads WHERE board_id = $1 AND sticky = False ORDER BY updated_at ' + reversed +
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
  })
  // handle sticky threads
  .then(function(threads) {
    if (page !== 1) { return {sticky: [], normal: threads}; }
    var retVal = { normal: threads };
    var stickyQ = 'SELECT id FROM threads WHERE board_id = $1 AND sticky = True ORDER BY created_at';
    var query = 'SELECT ' + columns + ' FROM ( ' + stickyQ + ' ) tlist LEFT JOIN LATERAL ( ' + q2 + ' ) t ON true LEFT JOIN LATERAL ( ' + q3 + ') p ON true';
    var params = [boardId];
    return db.sqlQuery(query, params)
    .then(function(stickyThreads) {
      return Promise.map(stickyThreads, function(thread) {
        return threadLastPost(thread)
        .then(function(thread) {
          thread.user = { id: thread.user_id, username: thread.username };
          delete thread.user_id;
          delete thread.username;
          return thread;
        });
      });
    })
    .then(function(stickyThreads) {
      retVal.sticky = stickyThreads;
      return retVal;
    });
  })
  .then(helper.slugify);
};

threads.incViewCount = function(threadId) {
  threadId = helper.deslugify(threadId);
  var increment = 'UPDATE metadata.threads SET views = views + 1 WHERE thread_id = $1;';
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
    .then(function(results) { thread = results.rows[0]; })
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
      q = 'UPDATE metadata.boards SET (thread_count, post_count) = (thread_count - 1, post_count - $1) WHERE board_id = $2';
      return client.queryAsync(q, params);
    })
    // update thread's new board metadata row
    .then(function() {
      params = [thread.post_count, newBoard.board_id];
      q = 'UPDATE metadata.boards SET (thread_count, post_count) = (thread_count + 1, post_count + $1) WHERE board_id = $2';
      return client.queryAsync(q, params);
    })
    // udpate thread's board_id with new board id
    .then(function() {
      params = [newBoardId, threadId];
      q = 'UPDATE threads SET board_id = $1 WHERE id = $2';
      return client.queryAsync(q, params);
    });
  }); // Promise disposer called at this point
};

threads.getThreadsBoard = function(threadId) {
  threadId = helper.deslugify(threadId);
  var q = 'SELECT b.* FROM threads t LEFT JOIN boards b ON t.board_id = b.id WHERE t.id = $1';
  return db.sqlQuery(q, [threadId])
  .then(function(rows) {
    if (rows.length > 0 ) { return rows[0]; }
    else { throw new NotFoundError('Board Not Found'); }
  })
  .then(helper.slugify);
};
