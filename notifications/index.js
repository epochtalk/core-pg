var notifications = {};
module.exports = notifications;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var using = Promise.using;

notifications.create = function(notification) {
  notification = helper.deslugify(notification);
  var q = 'INSERT INTO notifications(sender_id, receiver_id, data, created_at) VALUES ($1, $2, $3, now()) RETURNING id, created_at, viewed';
  var params = [notification.sender_id, notification.receiver_id, notification.data];
  return using(db.createTransaction(), function(client) {
    return client.queryAsync(q, params)
    .then(function(results) {
      if (results.rows.length > 0) {
        notification = results.rows[0];
      }
      else { throw new CreationError('Notification Could Not Be Saved'); }
    });
  })
  .then(function() { return helper.slugify(notification); });
};

notifications.count = function(userId) {
  userId = helper.deslugify(userId);

  // count notifications received by user
  // (results > 11) should be interpreted as 10+
  var q = 'SELECT * FROM notifications WHERE receiver_id = $1 LIMIT 11';
  return db.sqlQuery(q, [userId])
  .then(function(rows) { return rows.length; });
};
