var userNotes = {};
module.exports = userNotes;

var path = require('path');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));

userNotes.find = function(id) {
  id = helper.deslugify(id);
  var q = 'SELECT user_id, author_id, note, created_at, updated_at FROM user_notes WHERE id = $1';
  return db.scalar(q, [ id ])
  .then(helper.slugify);
};

userNotes.create = function(opts) {
  opts = helper.deslugify(opts);
  var q = 'INSERT INTO user_notes(user_id, author_id, note, created_at, updated_at) VALUES($1, $2, $3, now(), now()) RETURNING id, user_id, author_id, note, created_at, updated_at';
  var params = [ opts.user_id, opts.author_id, opts.note ];
  return db.scalar(q, params)
  .then(helper.slugify);
};

userNotes.update = function(opts) {
  opts = helper.deslugify(opts);
  var q = 'UPDATE user_notes SET note = $1, updated_at = now() WHERE id = $2 RETURNING id, user_id, author_id, note, created_at, updated_at';
  var params = [ opts.note, opts.id ];
  return db.scalar(q, params)
  .then(helper.slugify);
};

userNotes.delete = function(id) {
  id = helper.deslugify(id);
  var q = 'DELETE FROM user_notes WHERE id = $1 RETURNING id, user_id, author_id, note, created_at, updated_at';
  return db.scalar(q, [ id ])
  .then(helper.slugify);
};

userNotes.page = function(opts) {
  opts = opts;

  // Defaults
  var limit = 25;
  var page = 1;

  if (opts.limit) { limit = opts.limit; }
  else { opts.limit = limit; }
  if (opts.page) { page = opts.page; }
  else { opts.page = page; }

  // Build results object for return
  var results = Object.assign({}, opts);
  results.prev = results.page > 1 ? results.page - 1 : undefined;

  // Base Query
  var q = 'SELECT author_id, (SELECT username FROM users WHERE id = author_id) AS author_name, (SELECT avatar FROM users.profiles WHERE user_id = author_id) AS author_avatar, note, created_at, updated_at FROM user_notes WHERE user_id = $1 ORDER BY created_at DESC OFFSET $2 LIMIT $3';

  // Calculate pagination vars
  var offset = (page * limit) - limit;
  limit = limit + 1; // query one extra result to see if theres another page

  // Assign query params
  var params = [ helper.deslugify(opts.user_id), offset, limit ];
  return db.sqlQuery(q, params)
  .then(function(data) {
    // Check for next page then remove extra record
    if (data.length === limit) {
      results.next = page + 1;
      data.pop();
    }
    results.data = helper.slugify(data);
    return results;
  });
};
