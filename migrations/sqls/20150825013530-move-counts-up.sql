-- Move board's thread and post count from metadata to Boards
ALTER TABLE boards ADD COLUMN post_count integer default 0;
ALTER TABLE boards ADD COLUMN thread_count integer default 0;

UPDATE public.boards SET post_count = metadata.boards.post_count FROM metadata.boards WHERE public.boards.id = metadata.boards.board_id;
UPDATE public.boards SET thread_count = metadata.boards.thread_count FROM metadata.boards WHERE public.boards.id = metadata.boards.board_id;

-- Move thread's post count from metadata to Threads
ALTER TABLE threads ADD COLUMN post_count integer default 0;

UPDATE public.threads SET post_count = metadata.threads.post_count FROM metadata.threads WHERE public.threads.id = metadata.threads.thread_id;

-- Update Posts Create trigger
CREATE OR REPLACE FUNCTION create_post() RETURNS TRIGGER AS $create_post$
  BEGIN
    -- increment users.profiles' post_count
    UPDATE users.profiles SET post_count = post_count + 1 WHERE user_id = NEW.user_id;

    -- increment metadata.threads' post_count
    UPDATE threads SET post_count = post_count + 1 WHERE id = NEW.thread_id;

    -- update thread's created_at
    UPDATE threads SET created_at = (SELECT created_at FROM posts WHERE thread_id = NEW.thread_id ORDER BY created_at limit 1) WHERE id = NEW.thread_id;

    -- update thread's updated_at
    UPDATE threads SET updated_at = (SELECT created_at FROM posts WHERE thread_id = NEW.thread_id ORDER BY created_at DESC limit 1) WHERE id = NEW.thread_id;

    RETURN NEW;
  END;
$create_post$ LANGUAGE plpgsql;

-- Update Posts Delete trigger
CREATE OR REPLACE FUNCTION delete_post() RETURNS TRIGGER AS $delete_post$
  BEGIN
    -- decrement users.profiles' post_count
    UPDATE users.profiles SET post_count = post_count - 1 WHERE user_id = OLD.user_id;

    -- decrement metadata.threads' post_count
    UPDATE threads SET post_count = post_count - 1 WHERE id = OLD.thread_id;

    -- update thread's updated_at to last post available
    UPDATE threads SET updated_at = (SELECT created_at FROM posts WHERE thread_id = OLD.thread_id ORDER BY created_at DESC limit 1) WHERE id = OLD.thread_id;

    RETURN OLD;
  END;
$delete_post$ LANGUAGE plpgsql;

-- Update Threads Create trigger
CREATE OR REPLACE FUNCTION create_thread() RETURNS TRIGGER AS $create_thread$
  BEGIN
    -- increment metadata.boards' thread_count
    UPDATE boards SET thread_count = thread_count + 1 WHERE id = NEW.board_id;

    RETURN NEW;
  END;
$create_thread$ LANGUAGE plpgsql;

-- Drop old pre and post Threads Delete triggers and functions
DROP FUNCTION IF EXISTS pre_delete_thread();
DROP FUNCTION IF EXISTS post_delete_thread();
DROP TRIGGER IF EXISTS pre_delete_thread_trigger ON threads;
DROP TRIGGER IF EXISTS post_delete_thread_trigger ON threads;

-- Create threads Delete trigger and function
CREATE OR REPLACE FUNCTION delete_thread() RETURNS TRIGGER AS $delete_thread$
  BEGIN
    -- decrement metadata.boards' thread_count and post_count
    UPDATE boards SET post_count = post_count - OLD.post_count WHERE id = OLD.board_id;

    -- decrement metadata.boards' thread_count
    UPDATE boards SET thread_count = thread_count - 1 WHERE id = OLD.board_id;

    -- update metadata.boards' last post information
    UPDATE metadata.boards SET last_post_username = username, last_post_created_at = created_at, last_thread_id = thread_id, last_thread_title = title FROM (SELECT post.username as username, post.created_at as created_at, t.id as thread_id, post.title as title FROM ( SELECT id FROM threads WHERE board_id = OLD.board_id ORDER BY updated_at DESC LIMIT 1 ) t LEFT JOIN LATERAL ( SELECT u.username, p.created_at, p.title FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.thread_id = t.id ORDER BY p.created_at LIMIT 1 ) post ON true) AS subquery WHERE board_id = OLD.board_id;

    RETURN OLD;
  END;
$delete_thread$ LANGUAGE plpgsql;
CREATE TRIGGER delete_thread_trigger
  AFTER DELETE ON threads
  FOR EACH ROW
  EXECUTE PROCEDURE delete_thread();

-- Drop metadata.threads Update trigger and function
DROP TRIGGER IF EXISTS update_meta_thread_trigger ON metadata.threads;
DROP FUNCTION IF EXISTS update_meta_thread();

-- Create threads Update trigger
CREATE OR REPLACE FUNCTION update_thread() RETURNS TRIGGER AS $update_thread$
  BEGIN
    -- update metadta.board' post_count
    IF OLD.post_count < NEW.post_count THEN
      UPDATE boards SET post_count = post_count + 1 WHERE id = OLD.board_id;
    ELSE
      UPDATE boards SET post_count = post_count - 1 WHERE id = OLD.board_id;
    END IF;

    -- update metadata.boards' last post information
    UPDATE metadata.boards SET last_post_username = username, last_post_created_at = created_at, last_thread_id = thread_id, last_thread_title = title FROM (SELECT post.username as username, post.created_at as created_at, t.id as thread_id, post.title as title FROM ( SELECT id FROM threads WHERE board_id = OLD.board_id ORDER BY updated_at DESC LIMIT 1 ) t LEFT JOIN LATERAL ( SELECT u.username, p.created_at, p.title FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.thread_id = t.id ORDER BY p.created_at LIMIT 1 ) post ON true) AS subquery WHERE board_id = OLD.board_id;

    RETURN NEW;
  END;
$update_thread$ LANGUAGE plpgsql;
CREATE TRIGGER update_thread_trigger
  AFTER UPDATE OF post_count ON threads
  FOR EACH ROW
  EXECUTE PROCEDURE update_thread();

-- Drop old columns
ALTER TABLE metadata.boards DROP COLUMN IF EXISTS post_count;
ALTER TABLE metadata.boards DROP COLUMN IF EXISTS thread_count;
ALTER TABLE metadata.threads DROP COLUMN IF EXISTS post_count;
