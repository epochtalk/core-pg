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
  post.imported_at = timestamp;
  var q = 'INSERT INTO posts(title, body, user_id, thread_id, imported_at) VALUES($1, $2, $3, $4, $5) RETURNING id';
  var params = [post.title, post.body, post.user_id, post.thread_id, post.imported_at];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) return rows[0];
  })
  .catch(function(err) {
    console.log(err)
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
