var faker = require('faker');
var Promise = require('bluebird');
var fake = {};
module.exports = fake;

fake.userData = function(options) {
  var user = {
    password: faker.internet.password(),
    email: faker.internet.email(),
    username: faker.internet.userName()
  };
  return Promise.resolve(user);
};

fake.categoryData = function() {
  var category = {
    name: faker.company.bsAdjective()
  };
  return Promise.resolve(category);
};

fake.boardData = function(options) {
  var board = {
    name: faker.company.bsNoun(),
    description: faker.company.bsBuzz() + ' ' + faker.company.bsAdjective() + ' ' + faker.company.bsNoun()
  };
  if (options) {
    if (options.parent_board_id) board.parent_board_id = options.parent_board_id;
    if (options.category_id) board.category_id = options.category_id;
    if (options.children_ids) board.children_ids = options.children_ids;
  }
  return Promise.resolve(board);
};

fake.threadData = function(options) {
  var thread = {};
  if (options) {
    if (options.board_id) thread.board_id = options.board_id;
  }
  return Promise.resolve(thread);
};

fake.postData = function(options) {
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
  return Promise.resolve(post);
};
