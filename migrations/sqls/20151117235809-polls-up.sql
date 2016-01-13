CREATE TABLE polls (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES threads (id) ON DELETE CASCADE,
  question text NOT NULL,
  locked boolean DEFAULT false
);
CREATE UNIQUE INDEX index_polls_on_thread_id ON polls USING btree (thread_id);

CREATE TABLE poll_answers (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  answer text NOT NULL
);
CREATE INDEX index_poll_answers_on_poll_id ON poll_answers USING btree (poll_id);

CREATE TABLE poll_responses (
  poll_id uuid NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  answer_id uuid NOT NULL REFERENCES poll_answers (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX index_poll_responses_on_answer_id ON poll_responses USING btree (answer_id);
CREATE UNIQUE INDEX index_poll_responses_on_poll_id_and_user_id ON poll_responses USING btree (poll_id, user_id);
