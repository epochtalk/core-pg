CREATE TABLE users.preferences (
  user_id uuid REFERENCES users,
  posts_per_page integer DEFAULT 25,
  threads_per_page integer DEFAULT 25,
  collapsed_categories json DEFAULT '{"cats":[]}'::JSON
);

CREATE INDEX index_users_preferences_on_user_id ON users.preferences USING btree (user_id);
