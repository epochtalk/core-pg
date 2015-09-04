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

    -- update with post position
    UPDATE posts SET position = (SELECT post_count + 1 FROM threads WHERE id = threadId) WHERE id = NEW.id;

    -- increment metadata.threads' post_count
    UPDATE threads SET post_count = post_count + 1 WHERE id = threadId;

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

    -- update post positions for all higher post positions
    UPDATE posts SET position = position - 1 WHERE position > OLD.position AND thread_id = threadId;

    -- decrement metadata.threads' post_count
    UPDATE threads SET post_count = post_count - 1 WHERE id = threadId;

    RETURN OLD;
  END;
$delete_post$ LANGUAGE plpgsql;


-- Update delete thread function
CREATE OR REPLACE FUNCTION delete_thread() RETURNS TRIGGER AS $delete_thread$
  BEGIN
    -- decrement metadata.boards' thread_count and post_count
    UPDATE boards SET post_count = post_count - OLD.post_count WHERE id = OLD.board_id;

    -- decrement metadata.boards' thread_count
    UPDATE boards SET thread_count = thread_count - 1 WHERE id = OLD.board_id;

    -- update metadata.boards' last post information
    UPDATE metadata.boards
    SET last_post_username = username,
        last_post_created_at = created_at,
        last_thread_id = thread_id,
        last_thread_title = title,
        last_post_position = position
    FROM (
      SELECT pLast.username as username,
             pLast.created_at as created_at,
             t.id as thread_id,
             pFirst.title as title,
             pLast.position as position
      FROM (
        SELECT id
        FROM threads
        WHERE board_id = OLD.board_id
        ORDER BY updated_at DESC LIMIT 1
      ) t LEFT JOIN LATERAL (
        SELECT p.title
        FROM posts p
        WHERE p.thread_id = t.id
        ORDER BY p.created_at LIMIT 1
      ) pFirst ON true LEFT JOIN LATERAL (
        SELECT u.username, p.position, p.created_at
        FROM posts p LEFT JOIN users u ON u.id = p.user_id
        WHERE p.thread_id = t.id
        ORDER BY p.created_at DESC LIMIT 1
      ) pLast ON true
    ) AS subquery
    WHERE board_id = OLD.board_id;

    RETURN OLD;
  END;
$delete_thread$ LANGUAGE plpgsql;

-- Update update thread function
CREATE OR REPLACE FUNCTION update_thread() RETURNS TRIGGER AS $update_thread$
  BEGIN
    -- update metadta.board' post_count
    IF OLD.post_count < NEW.post_count THEN
      UPDATE boards SET post_count = post_count + 1 WHERE id = OLD.board_id;
    ELSE
      UPDATE boards SET post_count = post_count - 1 WHERE id = OLD.board_id;
    END IF;

    -- update metadata.boards' last post information
    UPDATE metadata.boards
    SET last_post_username = username,
        last_post_created_at = created_at,
        last_thread_id = thread_id,
        last_thread_title = title,
        last_post_position = position
    FROM (
      SELECT pLast.username as username,
             pLast.created_at as created_at,
             t.id as thread_id,
             pFirst.title as title,
             pLast.position as position
      FROM (
        SELECT id
        FROM threads
        WHERE board_id = OLD.board_id
        ORDER BY updated_at DESC LIMIT 1
      ) t LEFT JOIN LATERAL (
        SELECT p.title
        FROM posts p
        WHERE p.thread_id = t.id
        ORDER BY p.created_at LIMIT 1
      ) pFirst ON true LEFT JOIN LATERAL (
        SELECT u.username, p.position, p.created_at
        FROM posts p LEFT JOIN users u ON u.id = p.user_id
        WHERE p.thread_id = t.id
        ORDER BY p.created_at DESC LIMIT 1
      ) pLast ON true
    ) AS subquery
    WHERE board_id = OLD.board_id;

    RETURN NEW;
  END;
$update_thread$ LANGUAGE plpgsql;
