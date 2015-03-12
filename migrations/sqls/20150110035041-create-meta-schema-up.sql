CREATE SCHEMA metadata;

-- Boards
CREATE TABLE metadata.boards (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id uuid UNIQUE,
  post_count integer DEFAULT 0,
  thread_count integer DEFAULT 0,
  total_post_count integer DEFAULT 0,
  total_thread_count integer DEFAULT 0,
  last_post_username character varying(255),
  last_post_created_at timestamp with time zone,
  last_thread_id uuid,
  last_thread_title character varying (255)
);
CREATE UNIQUE INDEX index_boards_on_board_id ON metadata.boards USING btree (board_id);

ALTER TABLE metadata.boards ADD CONSTRAINT boards_board_id_fk FOREIGN KEY (board_id) REFERENCES boards (id);

--Threads
CREATE TABLE metadata.threads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id uuid UNIQUE,
  views integer DEFAULT 0
);
CREATE UNIQUE INDEX index_threads_on_thread_id ON metadata.threads USING btree(thread_id);
ALTER TABLE metadata.threads ADD CONSTRAINT threads_thread_id_fk FOREIGN KEY (thread_id) REFERENCES threads (id);
