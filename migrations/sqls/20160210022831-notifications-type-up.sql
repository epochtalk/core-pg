ALTER TABLE notifications ADD COLUMN type varchar(255);
CREATE INDEX index_notifications_on_type ON notifications USING btree (type);
