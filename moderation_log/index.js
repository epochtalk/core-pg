var moderationLog = {};
module.exports = moderationLog;

var path = require('path');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));

moderationLog.create = function(modLog) {
  modLog = helper.deslugify(modLog);
  var q = 'INSERT INTO moderation_log (mod_username, mod_id, mod_ip, action_api_url, action_api_method, action_obj, action_taken_at, action_type, action_display_text, action_display_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
  var params = [
    modLog.moderator.username,
    modLog.moderator.id,
    modLog.moderator.ip,
    modLog.action.api_url,
    modLog.action.api_method,
    modLog.action.obj,
    modLog.action.taken_at,
    modLog.action.type,
    modLog.action.display_text,
    modLog.action.display_url
  ];
  return db.sqlQuery(q, params);
};

// /api/modlog?page=1&limit=25
moderationLog.page = function(opts) {
  var limit = 10;
  var page = 1;
  var results, filterCol, filter;

  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.filterCol) { filterCol = opts.filterCol; }
  if (opts && opts.filter) { filter = opts.filter; }

  var q = 'SELECT position AS count FROM moderation_log ORDER BY position DESC LIMIT 1';

  return db.scalar(q)
  .then(function(row) {
    var count = row ? row.count : 0;
    results = {
      limit: limit,
      page: page,
      page_count: Math.ceil(count / limit),
      filter_col: filterCol || undefined,
      filter: filter || undefined
    };
    q = 'SELECT position, mod_username, mod_id, mod_ip, action_api_url, action_api_method, action_obj, action_taken_at, action_type, action_display_text, action_display_url FROM moderation_log WHERE position > $1';

    var position = (page * limit) - limit;
    var params;
    if (filterCol && filter) {
      q = [q, 'AND ' + filterCol + ' = $2 ORDER BY position LIMIT $3'].join(' ');
      params = [position, filter, limit];
    }
    else {
      q = [q, 'ORDER BY position LIMIT $2'].join(' ');
      params = [position, limit];
    }
    return db.sqlQuery(q, [position, limit]);
  })
  .then(function(logs) {
    results.data = logs;
    return results;
  })
  .then(helper.slugify);
};
