ALTER TABLE users.thread_views DROP CONSTRAINT thread_views_thread_id_fk;
ALTER TABLE users.thread_views DROP CONSTRAINT thread_views_user_id_fk;
ALTER TABLE users.profiles DROP CONSTRAINT profiles_user_id_fk;

ALTER TABLE users.thread_views ADD CONSTRAINT thread_views_thread_id_fk FOREIGN KEY (thread_id) REFERENCES threads (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE users.thread_views ADD CONSTRAINT thread_views_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE users.profiles ADD CONSTRAINT profiles_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL;
