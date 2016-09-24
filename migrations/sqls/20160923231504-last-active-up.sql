ALTER TABLE users.profiles ADD COLUMN last_active timestamp with time zone;
CREATE INDEX index_users_profiles_on_last_active ON users.profiles USING btree (last_active DESC);
