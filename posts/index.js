var posts = {};
module.exports = posts;

var path = require('path');
var pg = require('pg');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));
var db = require(path.join(__dirname, '..', 'db'));

posts.all = function() {
  return db.sqlQuery('SELECT * from posts');
};

posts.import = function(post) {
  var timestamp = new Date();
  var insertPostQuery = 'INSERT INTO posts(id, thread_id, user_id, title, body, created_at, updated_at, imported_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id';
  var params = [post.smf.ID_MSG, post.smf.ID_TOPIC, post.smf.ID_MEMBER, post.title, post.body, new Date(post.created_at), new Date(post.updated_at), timestamp];
  return db.sqlQuery(insertPostQuery, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { Promise.reject(); }
  })
  // increment post count on board
  .then(function(importPost) {
    var q = 'SELECT board_id FROM threads WHERE id = $1';
    params = [post.smf.ID_TOPIC];
    db.sqlQuery(q, params)
    .then(function(thread) {
      if (thread.length > 0) {
        incrementPostCount(thread[0].board_id, true);
      }
    });
    return importPost;
  });
};

var incrementPostCount = function increment(boardId, initial) {
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
  });
};

posts.create = function(post) {
  var timestamp = new Date();
  var createQuery = 'INSERT INTO posts(thread_id, user_id, title, body, encodedBody, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id';
  var params = [post.thread_id, post.user_id, post.title, post.body, post.encodedBody, timestamp, timestamp];
  return db.sqlQuery(createQuery, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { Promise.reject(); }
  })
  .then(function(createPost) {
    var q = 'SELECT board_id FROM threads WHERE id = $1';
    params = [post.thread_id];
    db.sqlQuery(q, params)
    .then(function(thread) {
      if (thread.length > 0) {
        incrementPostCount(thread[0].board_id, true);
      }
    });
    return createPost;
  })
  .then(function(createPost) {
    createPost.thread_id = post.thread_id;
    return createPost;
  });
};

posts.find = function(id) {
  var q = 'SELECT * FROM posts WHERE id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      return rows[0];
    }
  });
};

posts.byThread = function(threadId, opts) {
  // var q = 'SELECT * FROM posts WHERE thread_id = $1 LIMIT $2 OFFSET $3';
  var q = 'SELECT p.id, p.thread_id, p.user_id, p.title, p.body, p.created_at, p.updated_at, p.imported_at, u.username, up.signature ' +
          'FROM posts p ' +
          'LEFT JOIN users u on p.user_id = u.id ' +
          'LEFT JOIN users.profiles up on u.id = up.user_id ' +
          'WHERE p.thread_id = $1 ORDER BY p.created_at LIMIT $2 OFFSET $3';
  var limit = opts.limit || 10;
  var page = opts.page || 1;
  var offset = (page * limit) - limit;
  var params = [threadId, limit, offset];
  return db.sqlQuery(q, params)
  .then(function(posts) {
    return Promise.map(posts, function(post) {
      post.user = { id: post.user_id, username: post.username, signature: post.signature };
      delete post.user_id;
      delete post.username;
      delete post.signature;
      return post;
    });
  });
};


