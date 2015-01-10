ALTER TABLE boards ADD CONSTRAINT boards_parent_id_fk FOREIGN KEY (parent_board_id) REFERENCES boards (id);
ALTER TABLE boards ADD CONSTRAINT boards_category_id_fk FOREIGN KEY (category_id) REFERENCES categories (id);
ALTER TABLE threads ADD CONSTRAINT threads_board_id_fk FOREIGN KEY (board_id) REFERENCES boards (id);
ALTER TABLE posts ADD CONSTRAINT posts_thread_id_fk FOREIGN KEY (thread_id) REFERENCES threads (id);
ALTER TABLE posts ADD CONSTRAINT posts_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id);
