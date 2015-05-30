ALTER TABLE threads ADD COLUMN sticky boolean DEFAULT FALSE;
CREATE INDEX index_threads_on_sticky ON threads USING btree (board_id) WHERE sticky = true;
