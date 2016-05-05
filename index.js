module.exports = core;
var path = require('path');
var setup = require(path.join(__dirname, 'setup'));
var pg = require('pg');
var core = {};

function core(opts) {
  setup(opts);

  core.bans = require(path.join(__dirname, 'bans'));
  core.blacklist = require(path.join(__dirname, 'blacklist'));
  core.configurations = require(path.join(__dirname, 'configurations'));
  core.images = require(path.join(__dirname, 'images'));
  core.moderators = require(path.join(__dirname, 'moderators'));
  core.roles = require(path.join(__dirname, 'roles'));
  core.polls = require(path.join(__dirname, 'polls'));
  core.notifications = require(path.join(__dirname, 'notifications'));
  core.moderationLogs = require(path.join(__dirname, 'moderation_logs'));
  core.userNotes = require(path.join(__dirname, 'user_notes'));
  core.helper = require(path.join(__dirname, 'helper'));
  core.db = require(path.join(__dirname, 'db'));
  core.close = function() { pg.end(); };
  return core;
}
