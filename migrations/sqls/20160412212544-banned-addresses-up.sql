/* This is a duplicate of user-ip tracking to fix existing installations */
DROP TABLE IF EXISTS users.ips;

CREATE TABLE users.ips (
  user_id uuid NOT NULL,
  user_ip character varying(255) NOT NULL,
  created_at timestamp with time zone
);

CREATE INDEX index_ips_on_user_id ON users.ips USING btree (user_id);
CREATE INDEX index_ips_on_user_ip ON users.ips USING btree (user_ip);
CREATE UNIQUE INDEX index_ips_on_user_id_and_user_ip ON users.ips USING btree(user_id, user_ip);
CREATE INDEX index_ips_on_created_at ON users.ips USING btree (created_at);

DROP TABLE IF EXISTS banned_addresses;

CREATE TABLE IF NOT EXISTS banned_addresses (
  hostname character varying(255),
  ip1 integer,
  ip2 integer,
  ip3 integer,
  ip4 integer,
  weight decimal NOT NULL,
  decay boolean NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updates timestamp with time zone[] DEFAULT array[]::timestamp with time zone[]
);

ALTER TABLE banned_addresses ADD CONSTRAINT banned_addresses_unique_ip_contraint UNIQUE (ip1, ip2, ip3, ip4);
ALTER TABLE banned_addresses ADD CONSTRAINT banned_addresses_hostname_or_ip_contraint CHECK ( (ip1 IS NOT NULL AND ip2 IS NOT NULL AND ip3 IS NOT NULL AND ip4 IS NOT NULL AND hostname IS NULL) OR (hostname IS NOT NULL AND ip1 IS NULL AND ip2 IS NULL AND ip3 IS NULL AND ip4 IS NULL) );

CREATE UNIQUE INDEX index_banned_addresses_on_hostname ON banned_addresses USING btree (hostname);
CREATE INDEX index_banned_addresses_on_weight ON banned_addresses USING btree (weight);
CREATE INDEX index_banned_addresses_on_decay ON banned_addresses USING btree (decay);
CREATE INDEX index_banned_addresses_on_created_at ON banned_addresses USING btree (created_at);

ALTER TABLE users ADD COLUMN malicious_score decimal;
