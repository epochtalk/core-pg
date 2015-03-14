var path = require('path');
var fakeInsert = require(path.join(__dirname, '..', 'seed', 'fake-insert'));

// self-reference using a string
// ex: 'users.0'
module.exports = {
  run: [
    'categories',
    'boards'
  ],
  methods: {
    categories: fakeInsert.categories,
    boards: fakeInsert.boards
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
    ]
  }
};
