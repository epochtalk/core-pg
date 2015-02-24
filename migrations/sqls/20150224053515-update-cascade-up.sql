ALTER TABLE boards DROP CONSTRAINT boards_parent_id_fk;
ALTER TABLE boards  DROP CONSTRAINT boards_category_id_fk;
ALTER TABLE threads DROP CONSTRAINT threads_board_id_fk;
ALTER TABLE posts DROP CONSTRAINT posts_thread_id_fk;
ALTER TABLE posts DROP CONSTRAINT posts_user_id_fk;
