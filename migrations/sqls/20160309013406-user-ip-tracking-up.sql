CREATE TABLE users.ips (
  user_id uuid NOT NULL,
  user_ip character varying(255) NOT NULL,
  created_at timestamp with time zone
);

CREATE INDEX index_ips_on_user_id ON users.ips USING btree (user_id);
CREATE INDEX index_ips_on_user_ip ON users.ips USING btree (user_ip);
CREATE UNIQUE INDEX index_ips_on_user_id_and_user_ip ON users.ips USING btree(user_id, user_ip);
CREATE INDEX index_ips_on_created_at ON users.ips USING btree (created_at);

CREATE TABLE banned_addresses (
  address character varying(255) NOT NULL,
  undecayed_score decimal NOT NULL,
  decay_multiplier decimal,
  decay_exponent decimal,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL
);

CREATE UNIQUE INDEX index_banned_addresses_on_address ON banned_addresses USING btree (address);
CREATE INDEX index_banned_addresses_on_undecayed_score ON banned_addresses USING btree (undecayed_score);
CREATE INDEX index_banned_addresses_on_created_at ON banned_addresses USING btree (created_at);
CREATE INDEX index_banned_addresses_on_updated_at ON banned_addresses USING btree (updated_at);
