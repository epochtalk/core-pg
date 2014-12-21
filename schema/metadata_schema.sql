CREATE SCHEMA metadata;

CREATE TABLE metadata.boards (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  board_id integer,
  post_count integer,
  thread_count integer
);
CREATE INDEX index_boards_on_board_id ON metadata.boards USING btree (board_id);
ALTER TABLE metadata.boards ADD CONSTRAINT boards_board_id_fk FOREIGN KEY (board_id) REFERENCES boards (id);


CREATE TABLE metadata.threads (
  id serial PRIMARY KEY,
  thread_id integer UNIQUE,
  views integer DEFAULT 0
);
CREATE INDEX index_threads_on_thread_id ON metadata.threads USING btree(thread_id);
ALTER TABLE metadata.threads ADD CONSTRAINT threads_thread_id_fk FOREIGN KEY (thread_id) REFERENCES threads (id);
