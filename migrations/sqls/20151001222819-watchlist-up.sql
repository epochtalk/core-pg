CREATE TABLE users.watch_threads (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES threads (id) ON DELETE CASCADE
);
CREATE INDEX index_watch_threads_on_user_id ON users.watch_threads USING btree (user_id);
CREATE INDEX index_watch_threads_on_thread_id ON users.watch_threads USING btree (thread_id);
CREATE UNIQUE INDEX index_watch_threads_on_user_id_and_thread_id ON users.watch_threads USING btree (user_id, thread_id);

CREATE TABLE users.watch_boards (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES boards (id) ON DELETE CASCADE
);
CREATE INDEX index_watch_boards_on_user_id ON users.watch_boards USING btree (user_id);
CREATE INDEX index_watch_boards_on_board_id ON users.watch_boards USING btree (board_id);
CREATE UNIQUE INDEX index_watch_boards_on_user_id_and_board_id ON users.watch_boards USING btree (user_id, board_id);
