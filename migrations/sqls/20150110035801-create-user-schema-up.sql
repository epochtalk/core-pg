CREATE SCHEMA users;

CREATE TABLE users.thread_views (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid,
  thread_id uuid,
  time timestamp with time zone
);
CREATE INDEX index_thread_views_on_user_id ON users.thread_views USING btree (user_id);

ALTER TABLE users.thread_views ADD CONSTRAINT thread_views_thread_id_fk FOREIGN KEY (thread_id) REFERENCES threads (id);
ALTER TABLE users.thread_views ADD CONSTRAINT thread_views_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id);

CREATE TABLE users.profiles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid,
  avatar character varying(255),
  position character varying(255),
  signature text,
  fields json
);

CREATE UNIQUE INDEX index_profiles_on_user_id ON users.profiles USING btree (user_id);
ALTER TABLE users.profiles ADD CONSTRAINT profiles_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id);
