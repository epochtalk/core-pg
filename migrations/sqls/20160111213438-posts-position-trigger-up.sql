-- Update Posts Create trigger
CREATE OR REPLACE FUNCTION create_post() RETURNS TRIGGER AS $create_post$
  BEGIN
    -- increment users.profiles' post_count
    UPDATE users.profiles SET post_count = post_count + 1 WHERE user_id = NEW.user_id;

    -- update thread's created_at
    UPDATE threads SET created_at = (SELECT created_at FROM posts WHERE thread_id = NEW.thread_id ORDER BY created_at limit 1) WHERE id = NEW.thread_id;

    -- update thread's updated_at
    UPDATE threads SET updated_at = (SELECT created_at FROM posts WHERE thread_id = NEW.thread_id ORDER BY created_at DESC limit 1) WHERE id = NEW.thread_id;

    -- increment metadata.threads' post_count
    UPDATE threads SET post_count = post_count + 1 WHERE id = NEW.thread_id;

    
    -- update the thread's post positions
    UPDATE posts p
    SET position = sub.position
    FROM (
      SELECT id, row_number() over (partition by thread_id order by created_at) as position FROM posts WHERE thread_id = NEW.thread_id
    ) as sub
    WHERE p.id = sub.id;


    RETURN NEW;
  END;
$create_post$ LANGUAGE plpgsql;

-- Update Posts Delete trigger
CREATE OR REPLACE FUNCTION delete_post() RETURNS TRIGGER AS $delete_post$
  BEGIN
    -- decrement users.profiles' post_count
    UPDATE users.profiles SET post_count = post_count - 1 WHERE user_id = OLD.user_id;

    -- update thread's updated_at to last post available
    UPDATE threads SET updated_at = (SELECT created_at FROM posts WHERE thread_id = OLD.thread_id ORDER BY created_at DESC limit 1) WHERE id = OLD.thread_id;

    -- decrement metadata.threads' post_count
    UPDATE threads SET post_count = post_count - 1 WHERE id = OLD.thread_id;

    
    -- update the thread's post positions
    UPDATE posts p
    SET position = sub.position
    FROM (
      SELECT id, row_number() over (partition by thread_id order by created_at) as position FROM posts WHERE thread_id = NEW.thread_id
    ) as sub
    WHERE p.id = sub.id;


    RETURN OLD;
  END;
$delete_post$ LANGUAGE plpgsql;
