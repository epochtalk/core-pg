var posts = {};
module.exports = posts;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;
var DeletionError = Promise.OperationalError;
var CreationError = Promise.OperationalError;
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
      client.queryAsync(q, params)
      .then(function(results) {
        if (results.rows.length > 0) {
          post.id = results.rows[0].id;
          post.created_at = results.rows[0].created_at;
        }
        else { throw new CreationError('Post Could Not Be Saved'); }
      });
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
    return client.queryAsync(q, params)
    .then(function(results) {
      if (results.rows.length > 0) {
        post.id = results.rows[0].id;
        post.created_at = results.rows[0].created_at;
      }
      else { throw new CreationError('Post Could Not Be Saved'); }
    });
  })
  .then(function() { return helper.slugify(post); });
};

posts.update = function(post) {
  post = helper.deslugify(post);
  return using(db.createTransaction(), function(client) {
    var q, params;
    q = 'SELECT title, body, raw_body FROM posts WHERE id = $1 FOR UPDATE';
    return client.queryAsync(q, [post.id])
    .then(function(results) {
      if (results.rows.length > 0) { return results.rows[0]; }
      else { throw new NotFoundError('Post Not Found'); }
    })
    .then(function(oldPost) {
      post.title = post.title || oldPost.title;
      helper.updateAssign(post, oldPost, post, 'body');
      helper.updateAssign(post, oldPost, post, 'raw_body');
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
  var q = 'SELECT p.id, p.thread_id, t.board_id, p.user_id, p.title, p.body, p.raw_body, p.position, p.deleted, p.created_at, p.updated_at, p.imported_at, u.username, u.deleted as user_deleted, up.signature, up.avatar FROM posts p LEFT JOIN users u ON p.user_id = u.id LEFT JOIN users.profiles up ON u.id = up.user_id LEFT JOIN threads t ON p.thread_id = t.id WHERE p.id = $1';
  return db.sqlQuery(q, [id])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Post Not Found'); }
  })
  .then(formatPost)
  .then(helper.slugify);
};

posts.byThread = function(threadId, opts) {
  threadId = helper.deslugify(threadId);
  var columns = 'plist.id, post.thread_id, post.board_id, post.user_id, post.title, post.body, post.raw_body, post.position, post.deleted, post.created_at, post.updated_at, post.imported_at, post.username, post.user_deleted, post.signature, post.avatar, p2.highlight_color, p2.role_name';
  var q2 = 'SELECT p.thread_id, t.board_id, p.user_id, p.title, p.body, p.raw_body, p.position, p.deleted, p.created_at, p.updated_at, p.imported_at, u.username, u.deleted as user_deleted, up.signature, up.avatar FROM posts p ' +
    'LEFT JOIN users u ON p.user_id = u.id ' +
    'LEFT JOIN users.profiles up ON u.id = up.user_id ' +
    'LEFT JOIN threads t ON p.thread_id = t.id ' +
    'WHERE p.id = plist.id';
  var q3 = 'SELECT r.priority, r.highlight_color, r.name as role_name FROM roles_users ru ' +
    'LEFT JOIN roles r ON ru.role_id = r.id ' +
    'WHERE post.user_id = ru.user_id ' +
    'ORDER BY priority limit 1';

  opts = opts || {};
  var start = opts.start || 0;
  var limit = opts.limit || 25;

  // get total post count for this thread
  var q = 'SELECT id FROM posts WHERE thread_id = $1 AND position > $2 ORDER BY position LIMIT $3';
  var query = 'SELECT ' + columns + ' FROM ( ' +
    q + ' ) plist LEFT JOIN LATERAL ( ' +
    q2 + ' ) post ON true LEFT JOIN LATERAL ( ' +
    q3 + ' ) p2 ON true';
  var params = [threadId, start, limit];
  return db.sqlQuery(query, params)
  .map(formatPost)
  .then(helper.slugify);
};

var formatPost = function(post) {
  post.user = {
    id: post.user_id,
    username: post.username,
    deleted: post.user_deleted,
    signature: post.signature,
    highlight_color: post.highlight_color,
    role_name: post.role_name
  };
  delete post.user_id;
  delete post.username;
  delete post.user_deleted;
  delete post.signature;
  delete post.highlight_color;
  delete post.role_name;
  return post;
};

posts.pageByUserCount = function(username) {
  var q = 'SELECT p.post_count as count FROM users.profiles p JOIN users u ON(p.user_id = u.id) WHERE u.username = $1';
  var params = [username];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0].count; }
    else { return 0; }
  });
};

posts.pageByUser = function(username, opts) {
  var q = 'SELECT p.id, p.thread_id, p.user_id, p.title, p.raw_body, p.body, p.position, p.deleted, u.deleted as user_deleted, p.created_at, p.updated_at, p.imported_at, b.id as board_id, exists (SELECT board_id FROM board_mapping WHERE board_id = b.id) as board_visible, (SELECT p2.title FROM posts p2 WHERE p2.thread_id = p.thread_id ORDER BY p2.created_at LIMIT 1) as thread_title FROM posts p LEFT JOIN users u ON p.user_id = u.id LEFT JOIN threads t ON p.thread_id = t.id LEFT JOIN boards b ON t.board_id = b.id WHERE u.username = $1 ORDER BY';
  opts = opts || {};
  var limit = opts.limit || 25;
  var page = opts.page || 1;
  var sortField = opts.sortField || 'created_at';
  var order = opts.sortDesc ? 'DESC' : 'ASC';
  var offset = (page * limit) - limit;
  q = [q, sortField, order, 'LIMIT $2 OFFSET $3'].join(' ');
  var params = [username, limit, offset];
  return db.sqlQuery(q, params)
  .map(formatPost)
  .then(helper.slugify);
};

posts.delete = function(id) {
  id = helper.deslugify(id);
  var post;
  var q;

  return using(db.createTransaction(), function(client) {
    // lock up post row
    q = 'SELECT * from posts WHERE id = $1 FOR UPDATE';
    return client.queryAsync(q, [id])
    .then(function(results) {
      if (results.rows.length > 0) { post = results.rows[0]; }
      else { return Promise.reject('Post Not Found'); }
    })
    // check if post already deleted
    .then(function() {
      if (post.deleted) { throw new DeletionError('Post Already Deleted'); }
    })
    // set post deleted flag
    .then(function() {
      q = 'UPDATE posts SET deleted = TRUE WHERE id = $1';
      return client.queryAsync(q, [id]);
    })
    .then(function() { return post; });
  });
};

posts.undelete = function(id) {
  id = helper.deslugify(id);
  var post;
  var q;

  return using(db.createTransaction(), function(client) {
    // lock up post row
    q = 'SELECT * from posts WHERE id = $1 FOR UPDATE';
    return client.queryAsync(q, [id])
    .then(function(results) {
      if (results.rows.length > 0) { post = results.rows[0]; }
      else { return Promise.reject('Post Not Found'); }
    })
    // check if post is deleted
    .then(function() {
      if (!post.deleted) { throw new DeletionError('Post Not Deleted'); }
    })
    // set post deleted flag
    .then(function() {
      q = 'UPDATE posts SET deleted = False WHERE id = $1';
      return client.queryAsync(q, [id]);
    })
    .then(function() { return post; });
  });
};

posts.purge = function(id) {
  id = helper.deslugify(id);

  /*
   * There is a DB trigger on posts that will update the thread's post_count,
   * thread's updated_at, and user's post_count. This trigger will also trigger
   * another trigger on metadata.threads that updates the board's post_count and
   * board's last post information.
   */
  return using(db.createTransaction(), function(client) {
    var q = 'DELETE FROM posts WHERE id = $1';
    return client.queryAsync(q, [id]);
  });
};

posts.getPostsThread = function(postId) {
  postId = helper.deslugify(postId);
  var q = 'SELECT t.* FROM posts p LEFT JOIN threads t ON p.thread_id = t.id WHERE p.id = $1';
  return db.sqlQuery(q, [postId])
  .then(function(rows) {
    if (rows.length > 0 ) { return rows[0]; }
    else { throw new NotFoundError('Thread Not Found'); }
  })
  .then(helper.slugify);
};

posts.getPostsBoardInBoardMapping = function(postId) {
  postId = helper.deslugify(postId);
  var q = 'SELECT bm.* FROM posts p LEFT JOIN threads t ON p.thread_id = t.id LEFT JOIN board_mapping bm ON t.board_id = bm.board_id WHERE p.id = $1';
  return db.sqlQuery(q, [postId])
  .then(function(rows) {
    if (rows.length > 0 ) { return rows[0]; }
    else { return; }
  })
  .then(helper.slugify);
};

posts.getThreadFirstPost = function(postId) {
  postId = helper.deslugify(postId);
  var q = 'SELECT thread_id FROM posts WHERE id = $1';
  return db.sqlQuery(q, [postId])
  .then(function(rows) {
    if (rows.length > 0) {
      q = 'SELECT * FROM posts WHERE thread_id = $1 ORDER BY created_at LIMIT 1';
      return db.sqlQuery(q, [rows[0].thread_id]);
    }
    else { throw new NotFoundError('Post Not Found'); }
  })
  .then(function(rows) {
    if (rows.length > 0 ) { return rows[0]; }
    else { throw new NotFoundError('Thread Not Found'); }
  })
  .then(helper.slugify);
};
