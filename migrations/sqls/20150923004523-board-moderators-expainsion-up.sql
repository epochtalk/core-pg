ALTER TABLE board_moderators DROP CONSTRAINT board_moderators_board_id_fkey, ADD CONSTRAINT board_moderators_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE board_moderators DROP CONSTRAINT board_moderators_user_id_fkey, ADD CONSTRAINT board_moderators_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE;
CREATE UNIQUE INDEX index_board_moderators_on_user_id_and_board_id ON board_moderators USING btree (user_id, board_id);
