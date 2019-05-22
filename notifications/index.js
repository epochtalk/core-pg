var notifications = {};
module.exports = notifications;

var _ = require('lodash');
var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var using = Promise.using;
var errors = require(path.normalize(__dirname + '/../errors'));
var CreationError = errors.CreationError;

notifications.dismiss = function(options) {
  options = helper.deslugify(options);
  var q, params;
  var receiverId = _.get(options, 'receiver_id');
  var type =  _.get(options, 'type');
  var id =  _.get(options, 'id');

  // Dismiss specific notification
  if (id) {
    q = 'UPDATE notifications SET viewed = TRUE WHERE receiver_id = $1 AND type = $2 AND id = $3 AND viewed = FALSE';
    params = [receiverId, type, id];
  }
  // Dimiss all notifications
  else {
    q = 'UPDATE notifications SET viewed = TRUE WHERE receiver_id = $1 AND type = $2 AND viewed = FALSE';
    params = [receiverId, type];
  }

  return db.sqlQuery(q, params)
  .then(function() { return; });
};

// get the latest notifications for a user
notifications.latest = function(user_id, opts) {
  var receiver_id = helper.deslugify(user_id);

  var query = 'SELECT * FROM notifications WHERE receiver_id = $1 AND type = $2 AND viewed = FALSE ORDER BY created_at DESC LIMIT $3 OFFSET $4';

  var type = _.get(opts, 'type');
  var limit = _.get(opts, 'limit', 15);
  var page = _.get(opts, 'page', 1);
  var offset = (page * limit) - limit;

  var params = [receiver_id, type, limit, offset];
  return db.sqlQuery(query, params)
  .then(helper.slugify);
};

notifications.counts = function(user_id, opts) {
  var max = _.get(opts, 'max', 10);
  var postProcessCount = function(rows) {
    // if the total rows returned exceeds the max
    // return string value '{max}+'
    if (rows.length > max) {
      return max + '+';
    }
    // otherwise, return the count
    else {
      return rows.length;
    }
  };
  var receiver_id = helper.deslugify(user_id);
  var getNotificationsCount = function(type) {
    // count notifications received by user
    var q = 'SELECT * FROM notifications WHERE receiver_id = $1 AND type = $2 AND viewed = FALSE LIMIT $3';
    return db.sqlQuery(q, [receiver_id, type, max + 1])
    .then(postProcessCount);
  };
  var getOtherNotificationsCount = function(otherThanTypes) {
    // count notifications received by user
    var q = 'SELECT * FROM notifications WHERE receiver_id = $1 AND type != ANY ($2) AND viewed = FALSE LIMIT $3';
    return db.sqlQuery(q, [receiver_id, otherThanTypes, max + 1])
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
