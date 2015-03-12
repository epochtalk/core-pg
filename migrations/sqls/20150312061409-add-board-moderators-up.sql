CREATE TABLE board_moderators (
  user_id uuid REFERENCES users,
  board_id uuid REFERENCES boards
);
CREATE INDEX index_board_moderators_on_user_id ON board_moderators USING btree (user_id);
CREATE INDEX index_board_moderators_on_board_id ON board_moderators USING btree (board_id);
