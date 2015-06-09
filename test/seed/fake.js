var path = require('path');
var core = require(path.join(__dirname, '..', '..'))();
var faker = require('faker');
var Promise = require('bluebird');
var fake = {};
module.exports = fake;

fake.users = function() {
  var user = {
    password: faker.internet.password(),
    email: faker.internet.email(),
    username: faker.internet.userName()
  };
  return Promise.resolve(user).then(core.users.create);
};

fake.categories = function() {
  var category = {
    name: faker.company.bsAdjective()
  };
  return Promise.resolve(category).then(core.categories.create)
    .then(function(createdCategory) {
      // return name for runtime
      createdCategory.name = category.name;
      return createdCategory;
    });
};

fake.boards = function(options) {
  var board = {
    name: faker.company.bsNoun(),
    description: faker.company.bsBuzz() + ' ' + faker.company.bsAdjective() + ' ' + faker.company.bsNoun()
  };
  return Promise.resolve(board).then(core.boards.create);
};

fake.threads = function(options) {
  var thread = { sticky: false };
  if (options) {
    if (options.board_id) thread.board_id = options.board_id;
  }
  return Promise.resolve(thread).then(core.threads.create)
    .then(function(createdThread) {
      // return board_id for runtime
      createdThread.board_id = thread.board_id;
      return createdThread;
    });
};

fake.posts = function(options) {
  var body = '';
  var length = faker.helpers.randomNumber(7) + 1;
  for(var i = 0; i < length; i++) {
    body += faker.hacker.phrase() + '\n';
  }
  var post = {
    body: body,
    raw_body: body,
    title: faker.hacker.ingverb() + ' the ' + faker.hacker.adjective() + ' ' + faker.hacker.noun()
  };
  if (options) {
    if (options.thread_id) post.thread_id = options.thread_id;
    if (options.user_id) post.user_id = options.user_id;
  }
  return Promise.resolve(post).then(core.posts.create);
};
