module.exports = core;
var path = require('path');
var config = require(path.join(__dirname, 'config'));
var pg = require('pg');
var core = {};

function core(opts) {
  if (opts) config.update(opts);
  core.users = require(path.join(__dirname, 'users'));
  core.categories = require(path.join(__dirname, 'categories'));
  core.boards = require(path.join(__dirname, 'boards'));
  core.posts = require(path.join(__dirname, 'posts'));
  core.threads = require(path.join(__dirname, 'threads'));
  return core;
};
