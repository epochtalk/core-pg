var path = require('path');
var fake = require(path.join(__dirname, 'seed', 'fake'));
var core = require(path.join(__dirname, '..'));

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
    users: fake.userData,
    categories: fake.userData,
    boards: fake.boardData,
    threads: fake.threadData,
    posts: fake.postData
  },
  data: {
    users: [
      {},
      {},
      {},
      {}
    ],
    /*
    * fake.categoryData();
    */
    categories: [
      {},
      {},
      {},
      {}
    ],
    /*
    * fake.boardData({
    *   parent_board_id: runtime.boards[currentBoard.parentBoard].id,
    *   category_id: runtime.categories[currentBoard.category].id,
    *   children_ids: // function for children indexes to childrens' ids
    * });
    */
    boards: [
      { category_id: 'categories.0' }, // has children boards.1,2,3
      { category_id: 'categories.0', parent_board_id: 'boards.0' },
      { category_id: 'categories.0', parent_board_id: 'boards.0' },
      { parent_board_id: 'boards.0' },
      { category_id: 'categories.1' },
      {} // board with no parent, no children, no category
    ],
    /*
    * fake.threadData({
    *   board_id: runtime.boards[currentThread.board].id
    * });
    */
    threads: [
      { board_id: 'boards.0' },
      { board_id: 'boards.0' },
      { board_id: 'boards.0' },
      { board_id: 'boards.1' },
      { board_id: 'boards.1' },
      { board_id: 'boards.1' },
      { board_id: 'boards.2' },
      { board_id: 'boards.2' },
      { board_id: 'boards.2' },
      {}
    ],
    /*
    * fake.postData({
    *   thread_id: runtime.threads[currentPost.thread].id,
    *   user_id: runtime.users[currentPost.user].id
    * });
    */
    posts: [
      { thread_id: 'threads.0', user_id: 'users.0' },
      { thread_id: 'threads.0', user_id: 'users.1' },
      { thread_id: 'threads.0', user_id: 'users.2' },
      { thread_id: 'threads.1', user_id: 'users.0' },
      { thread_id: 'threads.2', user_id: 'users.1' },
      { thread_id: 'threads.3', user_id: 'users.2' },
      { thread_id: 'threads.4', user_id: 'users.0' },
      { thread_id: 'threads.5', user_id: 'users.1' },
      { thread_id: 'threads.6', user_id: 'users.2' },
      { thread_id: 'threads.7', user_id: 'users.0' },
      { thread_id: 'threads.8', user_id: 'users.1' },
      { thread_id: 'threads.9', user_id: 'users.2' },
      { thread_id: 'threads.0' },
      { user_id: 'users.0' },
      {}
    ]
  }
};
