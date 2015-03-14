var path = require('path');
var fakeInsert = require(path.join(__dirname, '..', 'seed', 'fake-insert'));

// self-reference using a string
// ex: 'users.0'
module.exports = {
  run: [
    'users'
  ],
  methods: {
    users: fakeInsert.users
  },
  data: {
    users: [
      {},
      {},
      {},
      {}
    ]
  }
};
