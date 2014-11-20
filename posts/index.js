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
  var insertPostQuery = 'INSERT INTO posts(title, body, imported_at, smf_id_msg, smf_id_topic, smf_id_member) VALUES($1, $2, $3, $4, $5, $6) RETURNING id';
  var params = [post.title, post.body, post.imported_at, post.smf.ID_MSG, post.smf.ID_TOPIC, post.smf.ID_MEMBER];
  return db.sqlQuery(insertPostQuery, params)
  .then(function(rows) {
    if (rows.length > 0) {
      return rows[0];
    }
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
