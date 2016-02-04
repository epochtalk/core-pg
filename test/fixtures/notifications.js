var path = require('path');
var fake = require(path.join(__dirname, '..', 'seed', 'fake'));

// self-reference using a string
// ex: 'users.0'
module.exports = {
  run: [
    'users',
    'notifications'
  ],
  methods: {
    users: fake.users,
    notifications: fake.notifications
  },
  data: {
    users: [
      {},
      {},
      {},
      {}
    ],
    notifications: [
      { sender_id: 'users.0.id', receiver_id: 'users.0.id' },
      { sender_id: 'users.0.id', receiver_id: 'users.1.id' },
      { sender_id: 'users.0.id', receiver_id: 'users.2.id' },
      { sender_id: 'users.1.id', receiver_id: 'users.0.id' },
      { sender_id: 'users.1.id', receiver_id: 'users.1.id' },
      { sender_id: 'users.1.id', receiver_id: 'users.2.id' },
      { sender_id: 'users.2.id', receiver_id: 'users.0.id' },
      { sender_id: 'users.2.id', receiver_id: 'users.1.id' },
      { sender_id: 'users.2.id', receiver_id: 'users.2.id' },
      { sender_id: 'users.3.id', receiver_id: 'users.0.id' },
      { sender_id: 'users.3.id', receiver_id: 'users.1.id' }
    ]
  }
};