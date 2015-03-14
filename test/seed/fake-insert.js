var path = require('path');
var core = require(path.join(__dirname, '..', '..'))();
var fake = require(path.join(__dirname, 'fake'));

var Promise = require('bluebird');

module.exports = {
  users: function(input) {
    return fake.userData(input).then(core.users.create);
  },
  categories: function(input) {
    return fake.categoryData(input).then(core.categories.create);
  },
  boards: function(input) {
    return fake.boardData(input).then(core.boards.create);
  }
};
