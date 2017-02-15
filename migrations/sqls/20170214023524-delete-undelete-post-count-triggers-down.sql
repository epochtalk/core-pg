DROP TRIGGER unhide_post_trigger ON posts;
DROP TRIGGER hide_post_trigger ON posts;
DROP FUNCTION unhide_post();
DROP FUNCTION hide_post();

-- Update Posts Create trigger
CREATE OR REPLACE FUNCTION create_post() RETURNS TRIGGER AS $create_post$
  BEGIN
    -- LOCKS
    PERFORM 1 FROM threads WHERE id = NEW.thread_id FOR UPDATE;
    PERFORM 1 FROM users.profiles WHERE user_id = NEW.user_id FOR UPDATE;

    -- increment users.profiles' post_count
    UPDATE users.profiles SET post_count = post_count + 1 WHERE user_id = NEW.user_id;

    -- update thread's created_at
    UPDATE threads SET created_at = (SELECT created_at FROM posts WHERE thread_id = NEW.thread_id ORDER BY created_at limit 1) WHERE id = NEW.thread_id;

    -- update thread's updated_at
    UPDATE threads SET updated_at = (SELECT created_at FROM posts WHERE thread_id = NEW.thread_id ORDER BY created_at DESC limit 1) WHERE id = NEW.thread_id;

    -- update with post position
    UPDATE posts SET position = (SELECT post_count + 1 FROM threads WHERE id = NEW.thread_id) WHERE id = NEW.id;

    -- increment metadata.threads' post_count
    UPDATE threads SET post_count = post_count + 1 WHERE id = NEW.thread_id;

    RETURN NEW;
  END;
$create_post$ LANGUAGE plpgsql;

-- Update Posts Delete trigger
CREATE OR REPLACE FUNCTION delete_post() RETURNS TRIGGER AS $delete_post$
  BEGIN
    -- LOCKS
    PERFORM 1 FROM threads WHERE id = OLD.thread_id FOR UPDATE;
    PERFORM 1 FROM users.profiles WHERE user_id = OLD.user_id FOR UPDATE;

    -- decrement users.profiles' post_count
    UPDATE users.profiles SET post_count = post_count - 1 WHERE user_id = OLD.user_id;

    -- update thread's updated_at to last post available
    UPDATE threads SET updated_at = (SELECT created_at FROM posts WHERE thread_id = OLD.thread_id ORDER BY created_at DESC limit 1) WHERE id = OLD.thread_id;

    -- update post positions for all higher post positions
    UPDATE posts SET position = position - 1 WHERE position > OLD.position AND thread_id = OLD.thread_id;

    -- decrement metadata.threads' post_count
    UPDATE threads SET post_count = post_count - 1 WHERE id = OLD.thread_id;

    RETURN OLD;
  END;
$delete_post$ LANGUAGE plpgsql;
