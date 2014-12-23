SELECT setval('boards_id_seq', max(id)) FROM boards; 
SELECT setval('categories_id_seq', max(id)) FROM categories; 
SELECT setval('posts_id_seq', max(id)) FROM posts; 
SELECT setval('threads_id_seq', max(id)) FROM threads; 
SELECT setval('users_id_seq', max(id)) FROM users; 
SELECT setval('users.thread_views_id_seq', max(id)) FROM users.thread_views; 
