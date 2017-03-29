CREATE SCHEMA mentions;

-- Mentions
CREATE TABLE mentions.mentions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  mentioner_id uuid NOT NULL REFERENCES users(id),
  mentionee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp with time zone
);

CREATE INDEX index_mentions_on_mentionee_id ON mentions.mentions USING btree (mentionee_id);
