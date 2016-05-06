/* User Activity Table */
CREATE TABLE user_activity (
  user_id uuid NOT NULL,
  current_period_start timestamp with time zone DEFAULT NULL,
  current_period_offset timestamp with time zone DEFAULT NULL,
  remaining_period_activity integer DEFAULT 14 NOT NULL,
  total_activity integer DEFAULT 0 NOT NULL
);

CREATE INDEX index_user_activity_on_user_id ON user_activity USING btree (user_id);
CREATE INDEX index_user_activity_on_total_activity ON user_activity USING btree (total_activity);

ALTER TABLE user_activity ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
