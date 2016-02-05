var notifications = {};
module.exports = notifications;

var _ = require('lodash');
var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var using = Promise.using;
var CreationError = Promise.OperationalError;

notifications.create = function(notification) {
  notification = helper.deslugify(notification);
  var q = 'INSERT INTO notifications(sender_id, receiver_id, data, created_at) VALUES ($1, $2, $3, now()) RETURNING id, created_at, viewed';
  var params = [_.get(notification, 'sender_id'), _.get(notification, 'receiver_id'), _.get(notification, 'data')];
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

// get the latest notifications for a user
notifications.latest = function(userId, opts) {
  userId = helper.deslugify(userId);

  var query = 'SELECT * FROM notifications WHERE receiver_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';

  var limit = _.get(opts, 'limit', 15);
  var page = _.get(opts, 'page', 1);
  var offset = (page * limit) - limit;

  var params = [userId, limit, offset];
  return db.sqlQuery(query, params)
  .then(helper.slugify);
};

notifications.count = function(userId) {
  userId = helper.deslugify(userId);

  // count notifications received by user
  // (results > 11) should be interpreted as 10+
  var q = 'SELECT * FROM notifications WHERE receiver_id = $1 LIMIT 11';
  return db.sqlQuery(q, [userId])
  .then(function(rows) { return rows.length; });
};
