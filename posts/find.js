var path = require('path');
var Promise = require('bluebird');
var common = require(path.normalize(__dirname + '/common'));
var NotFoundError = Promise.OperationalError;
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));

module.exports = function(id) {
  id = helper.deslugify(id);
  var q = 'SELECT p.id, p.thread_id, t.board_id, p.user_id, p.title, p.body, p.raw_body, p.position, p.deleted, p.locked, p.created_at, p.updated_at, p.imported_at, u.username, u.deleted as user_deleted, up.signature, up.avatar, up.fields->\'name\' as name FROM posts p LEFT JOIN users u ON p.user_id = u.id LEFT JOIN users.profiles up ON u.id = up.user_id LEFT JOIN threads t ON p.thread_id = t.id WHERE p.id = $1';
  return db.sqlQuery(q, [id])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Post Not Found'); }
  })
  .then(common.formatPost)
  .then(helper.slugify);
};
