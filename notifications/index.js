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
  var q = 'INSERT INTO notifications(sender_id, receiver_id, type, data, created_at) VALUES ($1, $2, $3, $4, now()) RETURNING id, created_at, viewed';
  var params = [_.get(notification, 'sender_id'), _.get(notification, 'receiver_id'), _.get(notification, 'type'), _.get(notification, 'data')];
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

notifications.dismiss = function(options) {
  options = helper.deslugify(options);
  var notifications;
  var q;

  return using(db.createTransaction(), function(client) {
    // lock up notification row
    q = 'SELECT * from notifications WHERE receiver_id = $1 AND type = $2 AND viewed = FALSE FOR UPDATE';
    return client.queryAsync(q, [_.get(options, 'receiver_id'), _.get(options, 'type')])
    .then(function(results) {
      if (results.rows.length > 0) {
        notifications = results.rows;
        q = 'UPDATE notifications SET viewed = TRUE WHERE receiver_id = $1 AND type = $2 AND viewed = FALSE';
        return client.queryAsync(q, [_.get(options, 'receiver_id'), _.get(options, 'type')])
      }
    })
    .then(helper.slugify);
  });
};

// get the latest notifications for a user
notifications.latest = function(user_id, opts) {
  var receiver_id = helper.deslugify(user_id);

  var query = 'SELECT * FROM notifications WHERE receiver_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4';

  var type = _.get(opts, 'type');
  var limit = _.get(opts, 'limit', 15);
  var page = _.get(opts, 'page', 1);
  var offset = (page * limit) - limit;

  var params = [receiver_id, type, limit, offset];
  return db.sqlQuery(query, params)
  .then(helper.slugify);
};

notifications.counts = function(user_id) {
  // (results > 11) should be interpreted as 10+
  var postProcessCount = function(rows) { return rows.length > 10 ? '10+' : rows.length; }
  var receiver_id = helper.deslugify(user_id);
  var getNotificationsCount = function(type) {
    // count notifications received by user
    var q = 'SELECT * FROM notifications WHERE receiver_id = $1 AND type = $2 LIMIT 11';
    return db.sqlQuery(q, [receiver_id, type])
    .then(postProcessCount);
  };
  var getOtherNotificationsCount = function(otherThanTypes) {
    // count notifications received by user
    var q = 'SELECT * FROM notifications WHERE receiver_id = $1 AND type != ANY ($2) LIMIT 11';
    return db.sqlQuery(q, [receiver_id, otherThanTypes])
    .then(postProcessCount);
  };

  return Promise.join(getNotificationsCount('message'), getNotificationsCount('mention'), getOtherNotificationsCount(['message', 'mention']), function(messageNotificationsCount, mentionNotificationsCount, otherNotificationsCount) {
    return {
      message: messageNotificationsCount,
      mention: mentionNotificationsCount,
      other: otherNotificationsCount
    };
  });
};
