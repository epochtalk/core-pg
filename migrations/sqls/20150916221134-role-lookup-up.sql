ALTER TABLE roles ADD COLUMN lookup character varying(255) NOT NULL;
ALTER TABLE roles ADD COLUMN priority integer NOT NULL DEFAULT NULL;
CREATE UNIQUE INDEX index_roles_on_lookup ON roles USING btree (lookup);

DELETE FROM roles;
