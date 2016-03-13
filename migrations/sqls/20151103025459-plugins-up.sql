CREATE TABLE plugins (
  id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
  name character varying(255) NOT NULL
);
CREATE UNIQUE INDEX index_plugins_name ON plugins USING btree (name);
