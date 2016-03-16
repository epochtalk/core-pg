var path = require('path');
var db = require(path.join(__dirname, '..', 'db'));
var faker = require('faker');
var Promise = require('bluebird');
var fake = {};
module.exports = fake;

fake.categories = function() {
  var category = {
    name: faker.company.bsAdjective()
  };
  return Promise.resolve(category).then(db.categories.create)
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
  return Promise.resolve(board).then(db.boards.create);
};

fake.threads = function(options) {
  var thread = { sticky: false };
  if (options) {
    if (options.board_id) thread.board_id = options.board_id;
  }
  return Promise.resolve(thread).then(db.threads.create)
    .then(function(createdThread) {
      // return board_id for runtime
      createdThread.board_id = thread.board_id;
      return createdThread;
    });
};
