DELETE FROM users.thread_views;
ALTER TABLE users.thread_views DROP COLUMN IF EXISTS id;
CREATE UNIQUE INDEX index_thread_views_on_user_id_and_thread_id On users.thread_views USING btree (user_id, thread_id);
