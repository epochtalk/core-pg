CREATE UNIQUE INDEX index_posts_thread_id_and_position ON posts USING btree (thread_id, position);
