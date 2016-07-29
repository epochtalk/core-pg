DROP INDEX index_user_activity_on_user_id;
CREATE UNIQUE INDEX index_user_activity_on_user_id ON user_activity USING btree (user_id);
