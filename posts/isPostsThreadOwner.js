var path = require('path');
var Promise = require('bluebird');
var NotFoundError = Promise.OperationalError;
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));

module.exports = function(postId, userId) {
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
