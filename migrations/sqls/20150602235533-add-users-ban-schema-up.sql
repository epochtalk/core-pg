CREATE TABLE users.bans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  expiration timestamp with time zone NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE UNIQUE INDEX index_bans_on_user_id ON users.bans USING btree (user_id);
ALTER TABLE users.bans ADD CONSTRAINT bans_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id);
