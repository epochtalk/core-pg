var posts = {};
module.exports = posts;

var path = require('path');
var pg = require('pg');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;

posts.import = function(post) {
  var timestamp = new Date();
  var q = 'INSERT INTO posts(id, thread_id, user_id, title, body, raw_body, created_at, updated_at, imported_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id';
  var postUUID = helper.intToUUID(post.smf.ID_MSG);
  var threadUUID = helper.intToUUID(post.smf.ID_TOPIC);
  var userUUID = helper.intToUUID(post.smf.ID_MEMBER);
  var params = [postUUID, threadUUID, userUUID || null, post.title, post.body, post.raw_body, new Date(post.created_at), new Date(post.updated_at), timestamp];

  var queryUser = 'SELECT id FROM users WHERE id = $1';
  var queryUserParams = [userUUID];
  return db.scalar(queryUser, queryUserParams)
  .then(function(user) {
    if (user) {
      insertPostProcessing(new Date(post.created_at), userUUID, threadUUID, q, params);
    }
    else {
      var userInsert = 'INSERT INTO users(id, username, email, imported_at) VALUES ($1, $2, $3, $4)';
      var userInsertParams = [userUUID, post.smf.posterName, post.smf.posterName + '@noemail.org.', timestamp];
      return db.sqlQuery(userInsert, userInsertParams)
      .then(function() {
        insertPostProcessing(new Date(post.created_at), userUUID, threadUUID, q, params);
      });
    }
  });
};

posts.create = function(post) {
  var timestamp = new Date();
  var q = 'INSERT INTO posts(thread_id, user_id, title, body, raw_body, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id';
  var params = [post.thread_id, post.user_id, post.title, post.body, post.raw_body, timestamp, timestamp];
  return insertPostProcessing(timestamp, post.user_id, post.thread_id, q, params);
};

var insertPostProcessing = function(timestamp, userId, threadId, insertQuery, insertParams) {
  var q, params, insertedPost, thread = {};

  return db.sqlQuery(insertQuery, insertParams)
  .then(function(rows) {
    if (rows.length > 0) {
      insertedPost = rows[0];
      insertedPost.thread_id = threadId;
    }
    else { Promise.reject(); }
  })
  // increment post count on board
  .then(function() {
    q = 'SELECT board_id, created_at, updated_at FROM threads WHERE id = $1';
    params = [threadId];
    return db.sqlQuery(q, params)
    .then(function(rows) {
      if (rows.length > 0) {
        thread.boardId = rows[0].board_id;
        thread.created_at = rows[0].created_at;
        thread.updated_at = rows[0].updated_at;
      }
    });
  })
  // update thread created_at if earlier post
  .then(function() {
    if (!thread.created_at || timestamp < thread.created_at) {
      q = 'UPDATE threads SET created_at = $1 WHERE id = $2';
      params = [timestamp, threadId];
      db.sqlQuery(q, params);
    }
  })
  .then(function() {
    if (!thread.updated_at || thread.updated_at < timestamp) {
      q = 'UPDATE threads set updated_at = $1 WHERE id = $2';
      params = [timestamp, threadId];
      db.sqlQuery(q, params);
    }
  })
  // update post count and last post by on metadata.board
  .then(function() {
    if (thread.boardId) {
      incrementPostCount(thread.boardId, userId, true);
      updateLastPostBy(thread.boardId, threadId, userId, timestamp);
    }
  })
  .then(function() { return insertedPost; });
};

var incrementPostCount = function increment(boardId, userId, initial) {
  var inc, params = [boardId];
  if (initial) {
    inc = 'UPDATE metadata.boards SET post_count = post_count + 1, total_post_count = total_post_count + 1 WHERE board_id = $1';
    db.sqlQuery(inc, params);
  }
  else {
    inc = 'UPDATE metadata.boards SET total_post_count = total_post_count + 1 WHERE board_id = $1';
    db.sqlQuery(inc, params);
  }

  // check if theres any parent boards
  var q = 'SELECT parent_board_id from boards WHERE id = $1';
  db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      increment(rows[0].parent_board_id);
    }
  })
  // increment user.profiles post_count
  .then(function() {
    var q = 'UPDATE users.profiles SET post_count = post_count+1 WHERE user_id = $1';
    var params = [userId];
    db.sqlQuery(q, params);
  });
};

var updateLastPostBy = function(boardId, threadId, userId, created_at) {
  var meta, username, title;

  // get metadata.board row
  var q = 'SELECT * FROM metadata.boards WHERE board_id = $1';
  var params = [boardId];
  db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      var row = rows[0];
      if (!row.last_post_created_at || row.last_post_created_at < created_at) {
        meta = row;
      }
    }
  })
  // get username
  .then(function() {
    if (meta) {
      q = 'SELECT username FROM users WHERE id = $1';
      params = [userId];
      return db.sqlQuery(q, params)
      .then(function(rows) {
        if (rows.length > 0) { username = rows[0].username; }
      });
    }
  })
  // get thread title
  .then(function() {
    if (meta) {
      q = 'SELECT p.title FROM threads t LEFT JOIN posts p ON t.id = p.thread_id WHERE t.id = $1 ORDER BY p.created_at LIMIT 1';
      params = [threadId];
      return db.sqlQuery(q, params)
      .then(function(rows) {
        if (rows.length > 0 ) { title = rows[0].title; }
      });
    }
  })
  .then(function() {
    if (meta && username && title) {
      q = 'UPDATE metadata.boards SET last_post_username = $1, last_thread_id = $2, last_post_created_at = $3, last_thread_title = $4 WHERE board_id = $5';
      params = [username, threadId, created_at, title, boardId];
      db.sqlQuery(q, params);
    }
  });
};

posts.update = function(post) {
  var timestamp = new Date();
  var q = 'SELECT title, body, raw_body FROM posts WHERE id = $1';
  var params = [post.id];
  return db.sqlQuery(q, params)
  .then(function(oldPost) {
    q = 'UPDATE posts SET title = $1, body = $2, raw_body = $3, thread_id = $4, updated_at = $5 WHERE id = $6 RETURNING id, title, body, raw_body, thread_id';
    var title = post.title || oldPost.title;
    var body = post.body || oldPost.body;
    var raw_body = post.raw_body || oldPost.raw_body;
    var thread_id = post.thread_id || oldPost.thread_id;
    params = [title, body, raw_body, thread_id, timestamp, post.id];
    return db.sqlQuery(q, params);
  })
  .then(function(newPost) { return newPost[0]; });
};

posts.find = function(id) {
  var q = 'SELECT * FROM posts WHERE id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Post not found'); }
  });
};

posts.byThread = function(threadId, opts) {
  var q = 'SELECT p.id, p.thread_id, p.user_id, p.title, p.body, p.raw_body, p.created_at, p.updated_at, p.imported_at, u.username, up.signature, up.avatar ' +
          'FROM posts p ' +
          'LEFT JOIN users u on p.user_id = u.id ' +
          'LEFT JOIN users.profiles up on u.id = up.user_id ' +
          'WHERE p.thread_id = $1 ORDER BY p.created_at LIMIT $2 OFFSET $3';
  var limit = 10;
  var page = 1;
  if (opts && opts.limit) limit = opts.limit;
  if (opts && opts.page) page = opts.page;
  var offset = (page * limit) - limit;
  var params = [threadId, limit, offset];
  return db.sqlQuery(q, params)
  .then(function(posts) {
    if (posts.length > 0) {
      return Promise.map(posts, function(post) {
        post.user = { id: post.user_id, username: post.username, signature: post.signature };
        delete post.user_id;
        delete post.username;
        delete post.signature;
        return post;
      });
    }
    else { return []; }
  });
};
