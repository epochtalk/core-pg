/* Post Reports Notes */
CREATE TABLE user_notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  author_id uuid NOT NULL,
  note text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE INDEX index_user_notes_on_user_id ON user_notes USING btree (user_id);
CREATE INDEX index_user_notes_on_created_at ON user_notes USING btree (created_at);

ALTER TABLE user_notes ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE user_notes ADD CONSTRAINT author_user_id_fk FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE;
