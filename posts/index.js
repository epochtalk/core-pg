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
      q = 'UPDATE posts SET title = $1, body = $2, raw_body = $3, thread_id = $4, updated_at = now() WHERE id = $5 RETURNING updated_at';
      params = [post.title, post.body, post.raw_body, post.thread_id, post.id];
      return client.queryAsync(q, params)
      .then(function(results) { post.updated_at = results.rows[0].updated_at; });
    });
  })
  .then(function() { return helper.slugify(post); });
};

posts.find = function(id) {
  id = helper.deslugify(id);
  var q = 'SELECT p.id, p.thread_id, t.board_id, p.user_id, p.title, p.body, p.raw_body, p.position, p.deleted, p.created_at, p.updated_at, p.imported_at, u.username, u.deleted as user_deleted, up.signature, up.avatar, up.fields->\'name\' as name FROM posts p LEFT JOIN users u ON p.user_id = u.id LEFT JOIN users.profiles up ON u.id = up.user_id LEFT JOIN threads t ON p.thread_id = t.id WHERE p.id = $1';
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
  var columns = 'plist.id, post.thread_id, post.board_id, post.user_id, post.title, post.body, post.raw_body, post.position, post.deleted, post.created_at, post.updated_at, post.imported_at, post.username, post.user_deleted, post.signature, post.avatar, post.name, p2.highlight_color, p2.role_name';
  var q2 = 'SELECT p.thread_id, t.board_id, p.user_id, p.title, p.body, p.raw_body, p.position, p.deleted, p.created_at, p.updated_at, p.imported_at, u.username, u.deleted as user_deleted, up.signature, up.avatar, up.fields->\'name\' as name FROM posts p ' +
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
    name: post.name,
    username: post.username,
    deleted: post.user_deleted,
    signature: post.signature,
    highlight_color: post.highlight_color,
    role_name: post.role_name
  };
  delete post.user_id;
  delete post.username;
  delete post.name;
  delete post.user_deleted;
  delete post.signature;
  delete post.highlight_color;
  delete post.role_name;
  return post;
};

posts.pageByUserCount = function(username) {
  var q = 'SELECT p.post_count as count ' +
  'FROM users.profiles p JOIN users u ON(p.user_id = u.id) ' +
  'WHERE u.username = $1';
  var params = [username];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0].count; }
    else { return 0; }
  });
};

posts.pageByUser = function(username, priority, opts) {
  var q = 'SELECT p.id, p.thread_id, p.user_id, p.raw_body, p.body, p.position, p.deleted, u.deleted as user_deleted, p.created_at, p.updated_at, p.imported_at, b.id as board_id, ' + 'EXISTS (SELECT 1 FROM boards WHERE board_id = b.id AND (b.viewable_by >= $2 OR b.viewable_by IS NULL)) as board_visible, ' +
    '(SELECT p2.title FROM posts p2 WHERE p2.thread_id = p.thread_id ORDER BY p2.created_at LIMIT 1) as thread_title ' +
    'FROM posts p ' +
    'LEFT JOIN users u ON p.user_id = u.id ' +
    'LEFT JOIN threads t ON p.thread_id = t.id ' +
    'LEFT JOIN boards b ON t.board_id = b.id ' +
    'WHERE u.username = $1 ORDER BY';
  opts = opts || {};
  var limit = opts.limit || 25;
  var page = opts.page || 1;
  var sortField = opts.sortField || 'created_at';
  var order = opts.sortDesc ? 'DESC' : 'ASC';
  var offset = (page * limit) - limit;
  q = [q, sortField, order, 'LIMIT $3 OFFSET $4'].join(' ');
  var params = [username, priority, limit, offset];
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
      post.deleted = true;
      q = 'UPDATE posts SET deleted = TRUE WHERE id = $1';
      return client.queryAsync(q, [id]);
    })
    .then(function() { return post; })
    .then(helper.slugify);
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
      post.deleted = false;
      q = 'UPDATE posts SET deleted = False WHERE id = $1';
      return client.queryAsync(q, [id]);
    })
    .then(function() { return post; })
    .then(helper.slugify);
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
    var q = 'DELETE FROM posts WHERE id = $1 RETURNING user_id, thread_id';
    return client.queryAsync(q, [id])
    .then(function(results) { return results.rows[0]; });
  })
  .then(helper.slugify);
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

posts.getPostsBoardInBoardMapping = function(postId, userPriority) {
  postId = helper.deslugify(postId);
  var q = 'SELECT t.board_id FROM posts p LEFT JOIN threads t ON p.thread_id = t.id WHERE p.id = $1';
  return db.sqlQuery(q, [postId])
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
    else { throw new NotFoundError('First Post Not Found'); }
  })
  .then(helper.slugify);
};

posts.isPostsThreadModerated = function(postId) {
  postId = helper.deslugify(postId);
  var q = 'SELECT t.moderated FROM posts p LEFT JOIN threads t ON p.thread_id = t.id WHERE p.id = $1';
  return db.sqlQuery(q, [postId])
  .then(function(rows) {
    if (rows.length > 0 ) { return rows[0]; }
    else { throw new NotFoundError('Thread Not Found'); }
  })
  .then(function(thread) { return thread.moderated; });
};

posts.isPostsThreadOwner = function(postId, userId) {
  postId = helper.deslugify(postId);
  userId = helper.deslugify(userId);

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
    else { throw new NotFoundError('First Post Not Found'); }
  })
  .then(function(post) { return post.user_id === userId; });
};
