var posts = {};
module.exports = posts;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;
var using = Promise.using;

posts.import = function(post) {
  // check if poster exists
  var q, params;
  var timestamp = Date.now();
  post.created_at = new Date(post.created_at) || timestamp;
  post.updated_at = new Date(post.updated_at) || timestamp;
  post.user_id = helper.intToUUID(post.smf.ID_MEMBER);
  return using(db.createTransaction(), function(client) {
    q = 'SELECT id FROM users WHERE id = $1';
    params = [post.user_id];
    return client.queryAsync(q, params)
    // create user if it does not exists
    .then(function(results) {
      if (!results.rows[0]) {
        q = 'INSERT INTO users(id, username, email, imported_at) VALUES ($1, $2, $3, now())';
        params = [post.user_id, post.smf.posterName, post.smf.posterName + '@noemail.org.'];
        return client.queryAsync(q, params); // users.profiles not required
      }
    })
    // insert post
    .then(function() {
      post.id = helper.intToUUID(post.smf.ID_MSG);
      post.thread_id = helper.intToUUID(post.smf.ID_TOPIC);
      var q = 'INSERT INTO posts(id, thread_id, user_id, title, body, raw_body, created_at, updated_at, imported_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8, now()) RETURNING id, created_at';
      var params = [post.id, post.thread_id, post.user_id || null, post.title, post.body, post.raw_body, post.created_at, post.updated_at];
      insertPostProcessing(post, q, params, client);
    });
  })
  .then(function() { return helper.slugify(post); });
};

posts.create = function(post) {
  post = helper.deslugify(post);
  var q, params;
  q = 'INSERT INTO posts(thread_id, user_id, title, body, raw_body, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, now(), now()) RETURNING id, created_at';
  params = [post.thread_id, post.user_id, post.title, post.body, post.raw_body];
  return using(db.createTransaction(), function(client) {
    return insertPostProcessing(post, q, params, client);
  })
  .then(function() { return helper.slugify(post); });
};

var insertPostProcessing = function(post, insertQ, insertParams, client) {
  var thread = {}, board = {}, user = {};
  var q, params;

  // lock post's thread and metadata.thread rows
  q = 'SELECT * FROM threads t JOIN metadata.threads mt ON mt.thread_id = t.id WHERE t.id = $1 FOR UPDATE';
  return client.queryAsync(q, [post.thread_id])
  .then(function(results) {
    if (results.rows.length > 0) { thread = results.rows[0]; }
  })
  // lock thread's board and metadata.board rows
  .then(function() {
    q = 'SELECT * FROM boards b JOIN metadata.boards mb ON mb.board_id = b.id WHERE b.id = $1 FOR UPDATE';
    return client.queryAsync(q, [thread.board_id])
    .then(function(results) {
      if (results.rows.length > 0) { board = results.rows[0]; }
    });
  })
  // lock post's user and user.profiles rows
  .then(function() {
    q = 'SELECT * FROM users u JOIN users.profiles up ON up.user_id = u.id WHERE u.id = $1 FOR UPDATE';
    return client.queryAsync(q, [post.user_id])
    .then(function(results) {
      if (results.rows.length > 0) { user = results.rows[0]; }
    });
  })
  // insert post
  .then(function() {
    return client.queryAsync(insertQ, insertParams)
    .then(function(results) {
      if (results.rows.length > 0) {
        post.id = results.rows[0].id;
        post.created_at = results.rows[0].created_at;
      }
      else { return Promise.reject('Cound not insert post'); }
    });
  })
  // update thread created_at if earlier post
  .then(function() {
    if (!thread.created_at || post.created_at < thread.created_at) {
      q = 'UPDATE threads SET created_at = $1 WHERE id = $2';
      return client.queryAsync(q, [post.created_at, post.thread_id]);
    }
  })
  // update thread updated_at with newer post
  .then(function() {
    if (!thread.updated_at || thread.updated_at < post.created_at) {
      q = 'UPDATE threads SET updated_at = $1 WHERE id = $2';
      return client.queryAsync(q, [post.created_at, post.thread_id]);
    }
  })
  // increment metadata.threads post_count
  .then(function() {
    q = 'UPDATE metadata.threads SET post_count = post_count + 1 WHERE thread_id = $1';
    return client.queryAsync(q, [post.thread_id]);
  })
  // increment metadata.boards post count
  .then(function() {
    q = 'UPDATE metadata.boards SET post_count = post_count + 1 WHERE board_id = $1';
    return client.queryAsync(q, [thread.board_id]);
  })
  // increment user.profiles post_count
  .then(function() {
    q = 'UPDATE users.profiles SET post_count = post_count + 1 WHERE user_id = $1';
    return client.queryAsync(q, [post.user_id]);
  })
  // update last post by on metadata.board
  .then(function() {
    // get thread title
    q = 'SELECT p.title FROM threads t JOIN posts p ON t.id = p.thread_id WHERE t.id = $1 ORDER BY p.created_at LIMIT 1 FOR UPDATE';
    return client.queryAsync(q, [post.thread_id])
    .then(function(results) {
      if (results.rows.length > 0 ) { return results.rows[0].title; }
    })
    // update last post information
    .then(function(title) {
      if (!board.last_post_created_at || board.last_post_created_at < post.created_at) {
        q = 'UPDATE metadata.boards SET last_post_username = $1, last_thread_id = $2, last_post_created_at = $3, last_thread_title = $4 WHERE board_id = $5';
        params = [user.username, post.thread_id, post.created_at, title, thread.board_id];
        return client.queryAsync(q, params);
      }
    });
  });
};

posts.update = function(post) {
  post = helper.deslugify(post);
  return using(db.createTransaction(), function(client) {
    var q, params;
    q = 'SELECT title, body, raw_body FROM posts WHERE id = $1 FOR UPDATE';
    return client.queryAsync(q, [post.id])
    .then(function(results) { return results.rows[0]; })
    .then(function(oldPost) {
      post.title = post.title || oldPost.title;
      post.body = post.body || oldPost.body;
      post.raw_body = post.raw_body || oldPost.raw_body;
      post.thread_id = post.thread_id || oldPost.thread_id;
    })
    .then(function() {
      q = 'UPDATE posts SET title = $1, body = $2, raw_body = $3, thread_id = $4, updated_at = now() WHERE id = $5';
      params = [post.title, post.body, post.raw_body, post.thread_id, post.id];
      return client.queryAsync(q, params);
    });
  })
  .then(function() { return helper.slugify(post); });
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

posts.pageByUserCount = function(username) {
  var q = 'SELECT p.post_count as count FROM users.profiles p JOIN users u ON(p.user_id = u.id) WHERE u.username = $1';
  var params = [username];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { return { count: 0 }; }
  });
};

posts.pageByUser = function(username, opts) {
  var q = 'SELECT p.id, p.thread_id, p.user_id, p.title, p.raw_body, p.body, p.created_at, p.updated_at, p.imported_at, (SELECT p2.title FROM posts p2 WHERE p2.thread_id = p.thread_id ORDER BY p2.created_at LIMIT 1) as thread_title FROM posts p JOIN users u ON(p.user_id = u.id) WHERE u.username = $1 ORDER BY';
  var limit = 10;
  var page = 1;
  var sortField = 'created_at';
  var order = 'ASC';
  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.sortField) { sortField = opts.sortField; }
  if (opts && opts.sortDesc) { order = 'DESC'; }
  var offset = (page * limit) - limit;
  q = [q, sortField, order, 'LIMIT $2 OFFSET $3'].join(' ');
  var params = [username, limit, offset];
  return db.sqlQuery(q, params)
  .then(helper.slugify);
};
