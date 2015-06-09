var path = require('path');
var fake = require(path.join(__dirname, 'seed', 'fake'));
var core = require(path.join(__dirname, '..'));

// self-reference using a string
// ex: 'users.0.id'
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
      {},
      {},
      {},
      {},
      {},
      {}
    ],
    /*
    * fake.threadData({
    *   board_id: runtime.boards[currentThread.board].id
    * });
    */
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
      {}
    ],
    /*
    * fake.postData({
    *   thread_id: runtime.threads[currentPost.thread].id,
    *   user_id: runtime.users[currentPost.user].id
    * });
    */
    posts: [
      { thread_id: 'threads.0.id', user_id: 'users.0.id' },
      { thread_id: 'threads.0.id', user_id: 'users.1.id' },
      { thread_id: 'threads.0.id', user_id: 'users.2.id' },
      { thread_id: 'threads.1.id', user_id: 'users.0.id' },
      { thread_id: 'threads.2.id', user_id: 'users.1.id' },
      { thread_id: 'threads.3.id', user_id: 'users.2.id' },
      { thread_id: 'threads.4.id', user_id: 'users.0.id' },
      { thread_id: 'threads.5.id', user_id: 'users.1.id' },
      { thread_id: 'threads.6.id', user_id: 'users.2.id' },
      { thread_id: 'threads.7.id', user_id: 'users.0.id' },
      { thread_id: 'threads.8.id', user_id: 'users.1.id' },
      { thread_id: 'threads.9.id', user_id: 'users.2.id' },
      { thread_id: 'threads.0.id' },
      { user_id: 'users.0.id' },
      {}
    ]
  }
};
