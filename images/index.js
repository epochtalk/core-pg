var images = {};
module.exports = images;

var path = require('path');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));

/* Image Expiration */

images.addImageExpiration = function(url, expiration) {
  var q = 'INSERT INTO image_expirations (image_url, expiration) VALUES ($1, $2)';
  return db.sqlQuery(q, [url, expiration]);
};

images.clearImageExpiration = function(url) {
  var q = 'DELETE FROM image_expirations WHERE image_url = $1';
  return db.sqlQuery(q, [url]);
};

images.getExpiredImages = function() {
  var q = 'SELECT image_url FROM image_expirations WHERE expiration < now()';
  return db.sqlQuery(q);
};

/* Post Images */

images.addPostImage = function(postId, url) {
  postId = helper.deslugify(postId);
  var q = 'INSERT INTO images_posts (image_url, post_id) VALUES ($1, $2)';
  return db.sqlQuery(q, [url, postId]);
};

images.removePostImages = function(postId) {
  postId = helper.deslugify(postId);
  var q = 'UPDATE images_posts SET post_id = NULL WHERE post_id = $1';
  return db.sqlQuery(q, [postId]);
};

images.getDeletedPostImages = function() {
  var q = 'SELECT id, image_url FROM images_posts WHERE post_id IS NULL';
  return db.sqlQuery(q).then(helper.slugify);
};

images.getImageReferences = function(url) {
  var q = 'SELECT post_id FROM images_posts WHERE image_url = $1';
  return db.sqlQuery(q, [url]).then(helper.slugify);
};

images.deleteImageReference = function(id) {
  id = helper.deslugify(id);
  var q = 'DELETE FROM images_posts WHERE id = $1';
  return db.sqlQuery(q, [id]);
};
