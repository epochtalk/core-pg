CREATE TABLE users.ips (
  user_id uuid NOT NULL,
  user_ip character varying(255) NOT NULL
);

CREATE INDEX index_ips_on_user_id ON users.ips USING btree (user_id);
CREATE INDEX index_ips_on_user_ip ON users.ips USING btree (user_ip);
CREATE UNIQUE INDEX index_ips_on_user_id_and_user_ip ON users.ips USING btree(user_id, user_ip);
