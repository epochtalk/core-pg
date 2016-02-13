CREATE TABLE users.board_bans (
  user_id uuid NOT NULL,
  board_id uuid NOT NULL
);

CREATE INDEX index_board_bans_on_user_id ON users.board_bans USING btree (user_id);
CREATE INDEX index_board_bans_on_board_id ON users.board_bans USING btree (board_id);
ALTER TABLE users.board_bans ADD CONSTRAINT board_bans_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE users.board_bans ADD CONSTRAINT board_bans_board_id_fk FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE;
