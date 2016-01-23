var blacklist = {};
module.exports = blacklist;

var path = require('path');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));

blacklist.all = function() {
  var q = 'SELECT * FROM blacklist';
  return db.sqlQuery(q)
  .then(helper.slugify);
};

blacklist.addRule = function(rule) {
  var q = 'INSERT INTO blacklist(ip_data, note) VALUES($1, $2)';
  var params = [rule.ip_data, rule.note];
  return db.sqlQuery(q, params)
  .then(blacklist.all);
};

blacklist.updateRule = function(rule) {
  rule = helper.deslugify(rule);
  var q = 'UPDATE blacklist SET ip_data = $1, note = $2 WHERE id = $3';
  var params = [rule.ip_data, rule.note, rule.id];
  return db.sqlQuery(q, params)
  .then(blacklist.all);
};

blacklist.deleteRule = function(ruleId) {
  ruleId = helper.deslugify(ruleId);
  var q = 'DELETE FROM blacklist WHERE id = $1';
  var params = [ruleId];
  return db.sqlQuery(q, params)
  .then(blacklist.all);
};
