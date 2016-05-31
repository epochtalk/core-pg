/* This is a duplicate of user-ip tracking to fix existing installations */
DROP TABLE IF EXISTS users.ignored;

CREATE TABLE users.ignored (
  user_id uuid NOT NULL,
  ignored_user_id uuid NOT NULL,
  created_at timestamp with time zone
);

CREATE INDEX index_ignored_on_user_id ON users.ignored USING btree (user_id);
CREATE INDEX index_ignored_on_user_ip ON users.ignored USING btree (ignored_user_id);
CREATE UNIQUE INDEX index_ignored_on_user_id_ignored_user_id ON users.ignored USING btree(user_id, ignored_user_id);
