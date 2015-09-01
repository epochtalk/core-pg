ALTER TABLE posts ADD COLUMN position integer;

-- Resets all post positions by created_at and thread_id
-- Expected run time: 1 hour 30 minutes
UPDATE posts p
SET position = sub.position
FROM (
  SELECT id, row_number() over (partition by thread_id order by created_at) as position FROM posts
) as sub
WHERE p.id = sub.id;

-- create index for post positions
CREATE INDEX index_posts_on_thread_id_position ON posts (thread_id, position);

-- Update Posts Create trigger
CREATE OR REPLACE FUNCTION create_post() RETURNS TRIGGER AS $create_post$
  DECLARE
    threadId uuid;
  BEGIN
    -- increment users.profiles' post_count
    UPDATE users.profiles SET post_count = post_count + 1 WHERE user_id = NEW.user_id;

    -- lock thread for post position
    SELECT INTO threadId id FROM threads WHERE id = NEW.thread_id FOR UPDATE;

    -- update thread's created_at
    UPDATE threads SET created_at = (SELECT created_at FROM posts WHERE thread_id = threadId ORDER BY created_at limit 1) WHERE id = threadId;

    -- update thread's updated_at
    UPDATE threads SET updated_at = (SELECT created_at FROM posts WHERE thread_id = threadId ORDER BY created_at DESC limit 1) WHERE id = threadId;

    -- increment metadata.threads' post_count
    UPDATE threads SET post_count = post_count + 1 WHERE id = threadId;

    UPDATE posts SET position = (SELECT post_count FROM threads WHERE id = threadId) WHERE id = NEW.id;

    RETURN NEW;
  END;
$create_post$ LANGUAGE plpgsql;

-- Update Posts Delete trigger
CREATE OR REPLACE FUNCTION delete_post() RETURNS TRIGGER AS $delete_post$
  DECLARE
    threadId uuid;
  BEGIN
    -- decrement users.profiles' post_count
    UPDATE users.profiles SET post_count = post_count - 1 WHERE user_id = OLD.user_id;

    -- lock thread for post position
    SELECT INTO threadId id FROM threads WHERE id = OLD.thread_id FOR UPDATE;

    -- update thread's updated_at to last post available
    UPDATE threads SET updated_at = (SELECT created_at FROM posts WHERE thread_id = threadId ORDER BY created_at DESC limit 1) WHERE id = threadId;

    -- decrement metadata.threads' post_count
    UPDATE threads SET post_count = post_count - 1 WHERE id = threadId;

    -- update post positions for all higher post positions
    UPDATE posts SET position = position - 1 WHERE position > OLD.position AND thread_id = threadId;

    RETURN OLD;
  END;
$delete_post$ LANGUAGE plpgsql;
