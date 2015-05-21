var posts = {};
module.exports = posts;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;

posts.import = function(post) {
  // check if poster exists
  var timestamp = Date.now();
  post.created_at = new Date(post.created_at) || timestamp;
  post.updated_at = new Date(post.updated_at) || timestamp;
  var userUUID = helper.intToUUID(post.smf.ID_MEMBER);
  var queryUser = 'SELECT id FROM users WHERE id = $1';
  var queryUserParams = [userUUID];
  return db.scalar(queryUser, queryUserParams)
  .then(function(user) {
    // create user if it does not exists
    if (!user) {
      var userInsert = 'INSERT INTO users(id, username, email, imported_at) VALUES ($1, $2, $3, now())';
      var userInsertParams = [userUUID, post.smf.posterName, post.smf.posterName + '@noemail.org.'];
      return db.sqlQuery(userInsert, userInsertParams);
    }
  })
  .then(function() {
    // insert post
    var postUUID = helper.intToUUID(post.smf.ID_MSG);
    var threadUUID = helper.intToUUID(post.smf.ID_TOPIC);
    var q = 'INSERT INTO posts(id, thread_id, user_id, title, body, raw_body, created_at, updated_at, imported_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8, now()) RETURNING id, created_at';
    var params = [postUUID, threadUUID, userUUID || null, post.title, post.body, post.raw_body, post.created_at, post.updated_at];
    insertPostProcessing(userUUID, threadUUID, q, params);
  });
};

posts.create = function(post) {
  post = helper.deslugify(post);
  var q = 'INSERT INTO posts(thread_id, user_id, title, body, raw_body, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, now(), now()) RETURNING id, created_at';
  var params = [post.thread_id, post.user_id, post.title, post.body, post.raw_body];
  return insertPostProcessing(post.user_id, post.thread_id, q, params);
};

var insertPostProcessing = function(userId, threadId, insertQuery, insertParams) {
  var insertedPost = {}, thread = {};

  return db.sqlQuery(insertQuery, insertParams)
  .then(function(rows) {
    if (rows.length > 0) {
      insertedPost.id = rows[0].id;
      insertedPost.thread_id = threadId;
      insertedPost.created_at = rows[0].created_at;
    }
    else { Promise.reject(); }
  })
  // increment post count on board
  .then(function() {
    var q = 'SELECT board_id, created_at, updated_at FROM threads WHERE id = $1';
    var params = [threadId];
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
    if (!thread.created_at || insertedPost.created_at < thread.created_at) {
      var q = 'UPDATE threads SET created_at = $1 WHERE id = $2';
      var params = [insertedPost.created_at, threadId];
      db.sqlQuery(q, params);
    }
  })
  .then(function() {
    if (!thread.updated_at || thread.updated_at < insertedPost.created_at) {
      var q = 'UPDATE threads SET updated_at = $1 WHERE id = $2';
      var params = [insertedPost.created_at, threadId];
      db.sqlQuery(q, params);
    }
  })
  // update post count on metadata.threads
  .then(function() {
    var q = 'UPDATE metadata.threads SET post_count = post_count + 1 WHERE thread_id = $1';
    var params = [threadId];
    db.sqlQuery(q, params);
  })
  // update post count and last post by on metadata.board
  .then(function() {
    if (thread.boardId) {
      incrementPostCount(thread.boardId, userId, true);
      updateLastPostBy(thread.boardId, threadId, userId, insertedPost.created_at);
    }
  })
  .then(function() { return helper.slugify(insertedPost); });
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
  post = helper.deslugify(post);
  var q = 'SELECT title, body, raw_body FROM posts WHERE id = $1';
  var params = [post.id];
  return db.sqlQuery(q, params)
  .then(function(oldPost) {
    q = 'UPDATE posts SET title = $1, body = $2, raw_body = $3, thread_id = $4, updated_at = now() WHERE id = $5 RETURNING id, title, body, raw_body, thread_id';
    var title = post.title || oldPost.title;
    var body = post.body || oldPost.body;
    var raw_body = post.raw_body || oldPost.raw_body;
    var thread_id = post.thread_id || oldPost.thread_id;
    params = [title, body, raw_body, thread_id, post.id];
    return db.sqlQuery(q, params);
  })
  .then(function(newPost) { return helper.slugify(newPost[0]); });
};

posts.find = function(id) {
  id = helper.deslugify(id);
  var q = 'SELECT * FROM posts WHERE id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Post not found'); }
  })
  .then(helper.slugify);
};

posts.byThread = function(threadId, opts) {
  threadId = helper.deslugify(threadId);
  var columns = 'plist.id, post.thread_id, post.user_id, post.title, post.body, post.raw_body, post.created_at, post.updated_at, post.imported_at, post.username, post.signature, post.avatar, p2.role';
  var q2 = 'SELECT p.thread_id, p.user_id, p.title, p.body, p.raw_body, p.created_at, p.updated_at, p.imported_at, u.username, up.signature, up.avatar FROM posts p ' +
    'LEFT JOIN users u on p.user_id = u.id ' +
    'LEFT JOIN users.profiles up on u.id = up.user_id ' +
    'WHERE p.id = plist.id';
  var q3 = 'SELECT r.name AS role FROM roles_users ru ' +
    'LEFT JOIN roles r ON ru.role_id = r.id ' +
    'WHERE post.user_id = ru.user_id ' +
    'ORDER BY CASE WHEN r.name = \'Administrator\' THEN \'1\' ' +
    'WHEN r.name = \'Global Moderator\' THEN \'2\' ' +
    'WHEN r.name = \'Moderator\' THEN \'3\' ' +
    'ELSE r.name END ASC LIMIT 1';

  var limit = 10;
  var page = 1;
  var reversed = ''; // ASC by default
  if (opts && opts.limit) limit = opts.limit;
  if (opts && opts.page) page = opts.page;
  var offset = (page * limit) - limit;

  // get total post count for this thread
  var getThreadSQL = 'SELECT post_count FROM metadata.threads WHERE thread_id = $1';
  var getThreadParams = [threadId];
  return db.scalar(getThreadSQL, getThreadParams)
  .then(function(result) {
    if (result) {
      // determine whether to start from the front or back
      var postCount = result.post_count;
      if (offset > Math.floor(postCount / 2)) {
        reversed = 'DESC';
        limit = postCount <= offset + limit ? postCount - offset : limit;
        offset = postCount <= offset + limit ? 0 : postCount - offset - limit;
      }
    }
  })
  // get all related posts
  .then(function() {
    var q = 'SELECT id FROM posts WHERE thread_id = $1 ORDER BY created_at ' + reversed +
      ' LIMIT $2 OFFSET $3';
    var query = 'SELECT ' + columns + ' FROM ( ' +
      q + ' ) plist LEFT JOIN LATERAL ( ' +
      q2 + ' ) post ON true LEFT JOIN LATERAL ( ' +
      q3 + ' ) p2 ON true';
    var params = [threadId, limit, offset];
    return db.sqlQuery(query, params);
  })
  .then(function(posts) {
    // reverse ordering if backward search
    if (reversed) { posts.reverse(); }
    // rearrange user properties
    return Promise.map(posts, function(post) {
      post.user = {
        id: post.user_id,
        username: post.username,
        signature: post.signature,
        role: post.role
      };
      delete post.user_id;
      delete post.username;
      delete post.signature;
      delete post.role;
      return post;
    })
    .then(helper.slugify);
  });
};
