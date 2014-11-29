UPDATE threads
SET board_id = boards.id
FROM boards
WHERE boards.smf_id_board = threads.smf_id_board

UPDATE posts
SET thread_id = threads.id
FROM threads
WHERE threads.smf_id_topic = posts.smf_id_topic

UPDATE posts
SET user_id = users.id
FROM users 
WHERE users.smf_id_member = posts.smf_id_member

