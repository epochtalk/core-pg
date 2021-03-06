CREATE TABLE trust (
  user_id uuid NOT NULL,
  user_id_trusted uuid NOT NULL,
  type smallint
);

CREATE INDEX index_trust_on_user_id ON trust USING btree (user_id);
CREATE INDEX index_trust_on_user_id_trusted ON trust USING btree (user_id_trusted);
CREATE INDEX index_trust_on_type ON trust USING btree (type);

ALTER TABLE trust ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE trust ADD CONSTRAINT user_id_trusted_fk FOREIGN KEY (user_id_trusted) REFERENCES users (id) ON DELETE CASCADE;

CREATE TABLE trust_feedback (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  risked_btc double precision DEFAULT NULL,
  scammer boolean,
  reference text DEFAULT NULL,
  comments text DEFAULT NULL,
  created_at timestamp with time zone
);

CREATE INDEX index_trust_feedback_on_user_id ON trust_feedback USING btree (user_id);
CREATE INDEX index_trust_feedback_on_reporter_id ON trust_feedback USING btree (reporter_id);
CREATE INDEX index_trust_feedback_on_scammer ON trust_feedback USING btree (scammer);
CREATE INDEX index_trust_feedback_on_created_at ON trust_feedback USING btree (created_at);

ALTER TABLE trust_feedback ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE trust_feedback ADD CONSTRAINT reporter_id_fk FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE;

CREATE TABLE trust_max_depth (
  user_id uuid NOT NULL,
  max_depth smallint NOT NULL DEFAULT 2
);

ALTER TABLE trust_max_depth ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE trust_max_depth ADD CONSTRAINT user_id_unique UNIQUE (user_id);

CREATE TABLE trust_boards (board_id uuid NOT NULL);

ALTER TABLE trust_boards ADD CONSTRAINT board_id_fk FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE;
ALTER TABLE trust_boards ADD CONSTRAINT board_id_unique UNIQUE (board_id);

INSERT INTO users(id, email, username, created_at, updated_at) VALUES ('537d639c-3b50-4545-bea1-8b38accf408e', 'DefaultTrustList@DefaultTrustList', 'DefaultTrustList', now(), now());
