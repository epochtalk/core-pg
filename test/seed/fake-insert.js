var path = require('path');
var core = require(path.join(__dirname, '..', '..'))();
var fake = require(path.join(__dirname, 'fake'));

var Promise = require('bluebird');

module.exports = {
  users: function(input) {
    return fake.userData(input).then(core.users.create);
  }
};
