/* Replace with your SQL commands */
ALTER TABLE metadata.threads ADD COLUMN post_count integer DEFAULT 0;

UPDATE metadata.threads mt SET post_count = (
  SELECT count(id) FROM posts p WHERE mt.thread_id = p.thread_id
);
