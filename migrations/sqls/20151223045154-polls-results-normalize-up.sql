DROP INDEX index_poll_responses_on_poll_id_and_user_id;
CREATE INDEX index_poll_responses_on_user_id ON poll_responses USING btree (user_id);
ALTER TABLE poll_responses DROP COLUMN poll_id;
