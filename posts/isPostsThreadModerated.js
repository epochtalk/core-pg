var path = require('path');
var Promise = require('bluebird');
var NotFoundError = Promise.OperationalError;
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));

module.exports = function(postId) {
  postId = helper.deslugify(postId);
  var q = 'SELECT t.moderated FROM posts p LEFT JOIN threads t ON p.thread_id = t.id WHERE p.id = $1';
  return db.sqlQuery(q, [postId])
  .then(function(rows) {
    if (rows.length > 0 ) { return rows[0]; }
    else { throw new NotFoundError('Thread Not Found'); }
  })
  .then(function(thread) { return thread.moderated; });
};
