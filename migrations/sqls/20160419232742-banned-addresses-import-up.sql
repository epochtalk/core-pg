ALTER TABLE banned_addresses ADD COLUMN imported_at timestamp with time zone DEFAULT NULL;
CREATE INDEX index_banned_addresses_on_imported_at ON banned_addresses USING btree (imported_at);
