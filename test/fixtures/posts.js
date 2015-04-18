var path = require('path');
var fake = require(path.join(__dirname, '..', 'seed', 'fake'));

// self-reference using a string
// ex: 'users.0'
module.exports = {
  run: [
    'users',
    'categories',
    'boards',
    'threads',
    'posts'
  ],
  methods: {
    users: fake.users,
    categories: fake.categories,
    boards: fake.boards,
    threads: fake.threads,
    posts: fake.posts
  },
  data: {
    users: [
      {},
      {},
      {},
      {}
    ],
    categories: [
      {},
      {},
      {},
      {}
    ],
    boards: [
      { category_id: 'categories.0.id' }, // has children boards.1,2,3
      { category_id: 'categories.0.id', parent_board_id: 'boards.0.id' },
      { category_id: 'categories.0.id', parent_board_id: 'boards.0.id' },
      { parent_board_id: 'boards.0.id' },
      {}
    ],
    threads: [
      { board_id: 'boards.0.id' },
      { board_id: 'boards.0.id' },
      { board_id: 'boards.0.id' },
      { board_id: 'boards.1.id' },
      { board_id: 'boards.1.id' },
      { board_id: 'boards.1.id' },
      { board_id: 'boards.2.id' },
      { board_id: 'boards.2.id' },
      { board_id: 'boards.2.id' },
      { board_id: 'boards.2.id' },
      { board_id: 'boards.2.id' }
    ],
    posts: [
      { thread_id: 'threads.0.id', user_id: 'users.0.id' },
      { thread_id: 'threads.1.id', user_id: 'users.0.id' },
      { thread_id: 'threads.2.id', user_id: 'users.1.id' },
      { thread_id: 'threads.3.id', user_id: 'users.2.id' },
      { thread_id: 'threads.4.id', user_id: 'users.0.id' },
      { thread_id: 'threads.5.id', user_id: 'users.1.id' },
      { thread_id: 'threads.6.id', user_id: 'users.2.id' },
      { thread_id: 'threads.7.id', user_id: 'users.0.id' },
      { thread_id: 'threads.8.id', user_id: 'users.1.id' },
      { thread_id: 'threads.9.id', user_id: 'users.2.id' }
    ]
  }
};
