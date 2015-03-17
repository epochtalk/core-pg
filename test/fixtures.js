var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))();
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixtures = {
  categories: require(path.join(__dirname, 'fixtures', 'categories')),
  users: require(path.join(__dirname, 'fixtures', 'users')),
  boards: require(path.join(__dirname, 'fixtures', 'boards')),
  threads: require(path.join(__dirname, 'fixtures', 'threads')),
  posts: require(path.join(__dirname, 'fixtures', 'categories'))
};

lab.experiment('_Fixtures', function() {
  var runtime = {};
  lab.before(function(done) {
    return seed(fixtures.categories)
    .then(function(categories) {
      runtime.categories = categories;
      return seed(fixtures.users);
    })
    .then(function(users) {
      runtime.users = users;
      return seed(fixtures.boards);
    })
    .then(function(boards) {
      runtime.boards = boards;
      return seed(fixtures.threads);
    })
    .then(function(threads) {
      runtime.threads = threads;
      return seed(fixtures.posts);
    })
    .then(function(posts) {
      runtime.posts = posts;
      done();
    });
  });
});
