DROP INDEX index_poll_responses_on_poll_id_and_user_id;
CREATE INDEX index_poll_responses_on_poll_id_and_user_id ON poll_responses USING btree (poll_id, user_id);
ALTER TABLE polls ADD COLUMN max_answers integer NOT NULL DEFAULT 1;
ALTER TABLE polls ADD COLUMN expiration timestamp with time zone;
ALTER TABLE polls ADD COLUMN change_vote boolean NOT NULL DEFAULT false;
CREATE TYPE polls_display_enum AS ENUM ('always', 'voted', 'expired');
ALTER TABLE polls ADD COLUMN display_mode polls_display_enum NOT NULL DEFAULT 'always';
