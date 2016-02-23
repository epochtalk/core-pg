module.exports = core;
var path = require('path');
var setup = require(path.join(__dirname, 'setup'));
var pg = require('pg');
var core = {};

function core(opts) {
  setup(opts);

  core.blacklist = require(path.join(__dirname, 'blacklist'));
  core.configurations = require(path.join(__dirname, 'configurations'));
  core.users = require(path.join(__dirname, 'users'));
  core.categories = require(path.join(__dirname, 'categories'));
  core.boards = require(path.join(__dirname, 'boards'));
  core.posts = require(path.join(__dirname, 'posts'));
  core.threads = require(path.join(__dirname, 'threads'));
  core.reports = require(path.join(__dirname, 'reports'));
  core.images = require(path.join(__dirname, 'images'));
  core.messages = require(path.join(__dirname, 'messages'));
  core.conversations = require(path.join(__dirname, 'conversations'));
  core.moderators = require(path.join(__dirname, 'moderators'));
  core.roles = require(path.join(__dirname, 'roles'));
  core.watchlist = require(path.join(__dirname, 'watchlist'));
  core.polls = require(path.join(__dirname, 'polls'));
  core.notifications = require(path.join(__dirname, 'notifications'));
  core.moderationLogs = require(path.join(__dirname, 'moderation_logs'));
  core.helper = require(path.join(__dirname, 'helper'));
  core.db = require(path.join(__dirname, 'db'));
  core.close = function() { pg.end(); };
  return core;
}
