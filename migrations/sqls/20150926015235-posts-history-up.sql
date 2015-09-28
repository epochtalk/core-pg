CREATE TABLE posts_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id uuid,
  raw_body text DEFAULT '',
  body text DEFAULT '' NOT NULL,
  created_at timestamp with time zone
);

CREATE INDEX index_posts_history_on_post_id ON posts_history USING btree (post_id);
