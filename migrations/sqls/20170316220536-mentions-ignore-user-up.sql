-- Mentions Ignore User
CREATE TABLE mentions.ignored (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ignored_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unique (user_id, ignored_user_id)
);

CREATE INDEX index_mentions_ignored_on_user_id ON mentions.ignored USING btree (user_id);
CREATE INDEX index_mentions_ignored_on_ignored_user_id ON mentions.ignored USING btree (ignored_user_id);
