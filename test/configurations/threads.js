var path = require('path');
var fake = require(path.join(__dirname, '..', 'seed', 'fake'));

// self-reference using a string
// ex: 'users.0'
module.exports = {
  run: [
    'categories',
    'boards',
    'threads'
  ],
  methods: {
    categories: fake.categories,
    boards: fake.boards,
    threads: fake.threads
  },
  data: {
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
      { board_id: 'boards.2.id' }
    ]
  }
};
