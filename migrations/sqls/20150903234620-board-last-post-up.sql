-- Add last_post_position column to metadata.boards table
ALTER TABLE metadata.boards ADD COLUMN last_post_position integer;

-- Update all boards with new column value
CREATE OR REPLACE FUNCTION reset_last_post_data() RETURNS VOID AS $$
DECLARE
  boardRecord RECORD;
BEGIN
  FOR boardRecord IN SELECT board_id FROM metadata.boards LOOP
    UPDATE metadata.boards SET last_post_username = username, last_post_created_at = created_at, last_thread_id = thread_id, last_thread_title = title, last_post_position = position FROM (SELECT post.username as username, t.updated_at as created_at, t.id as thread_id, post.title as title, t.post_count as position FROM ( SELECT id, updated_at, post_count FROM threads WHERE board_id = boardRecord.board_id ORDER BY updated_at DESC LIMIT 1 ) t LEFT JOIN LATERAL ( SELECT u.username, p.title FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.thread_id = t.id ORDER BY p.created_at LIMIT 1 ) post ON true) AS subquery WHERE board_id = boardRecord.board_id;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql;
SELECT reset_last_post_data();
DROP FUNCTION reset_last_post_data();

-- Update delete thread function
CREATE OR REPLACE FUNCTION delete_thread() RETURNS TRIGGER AS $delete_thread$
  BEGIN
    -- decrement metadata.boards' thread_count and post_count
    UPDATE boards SET post_count = post_count - OLD.post_count WHERE id = OLD.board_id;

    -- decrement metadata.boards' thread_count
    UPDATE boards SET thread_count = thread_count - 1 WHERE id = OLD.board_id;

    -- update metadata.boards' last post information
    UPDATE metadata.boards SET last_post_username = username, last_post_created_at = created_at, last_thread_id = thread_id, last_thread_title = title, last_post_position = position FROM (SELECT post.username as username, t.updated_at as created_at, t.id as thread_id, post.title as title, t.post_count as position FROM ( SELECT id, updated_at, post_count FROM threads WHERE board_id = OLD.board_id ORDER BY updated_at DESC LIMIT 1 ) t LEFT JOIN LATERAL ( SELECT u.username, p.title FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.thread_id = t.id ORDER BY p.created_at LIMIT 1 ) post ON true) AS subquery WHERE board_id = OLD.board_id;

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
    UPDATE metadata.boards SET last_post_username = username, last_post_created_at = created_at, last_thread_id = thread_id, last_thread_title = title, last_post_position = position FROM (SELECT post.username as username, t.updated_at as created_at, t.id as thread_id, post.title as title, t.post_count as position FROM ( SELECT id, updated_at, post_count FROM threads WHERE board_id = OLD.board_id ORDER BY updated_at DESC LIMIT 1 ) t LEFT JOIN LATERAL ( SELECT u.username, p.title FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.thread_id = t.id ORDER BY p.created_at LIMIT 1 ) post ON true) AS subquery WHERE board_id = OLD.board_id;

    RETURN NEW;
  END;
$update_thread$ LANGUAGE plpgsql;
