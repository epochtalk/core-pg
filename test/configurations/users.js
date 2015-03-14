var path = require('path');
var fake = require(path.join(__dirname, '..', 'seed', 'fake'));
var core = require(path.join(__dirname, '..', '..'))();

// self-reference using a string
// ex: 'users.0'
module.exports = {
  run: [
    'users'
  ],
  methods: {
    users: [ fake.userData, core.users.create ]
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
