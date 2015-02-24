ALTER TABLE boards DROP CONSTRAINT boards_parent_id_fk;
ALTER TABLE boards  DROP CONSTRAINT boards_category_id_fk;
ALTER TABLE threads DROP CONSTRAINT threads_board_id_fk;
ALTER TABLE posts DROP CONSTRAINT posts_thread_id_fk;
ALTER TABLE posts DROP CONSTRAINT posts_user_id_fk;

ALTER TABLE boards ADD CONSTRAINT boards_parent_id_fk FOREIGN KEY (parent_board_id) REFERENCES boards (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE boards ADD CONSTRAINT boards_category_id_fk FOREIGN KEY (category_id) REFERENCES categories (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE threads ADD CONSTRAINT threads_board_id_fk FOREIGN KEY (board_id) REFERENCES boards (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE posts ADD CONSTRAINT posts_thread_id_fk FOREIGN KEY (thread_id) REFERENCES threads (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE posts ADD CONSTRAINT posts_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL;
