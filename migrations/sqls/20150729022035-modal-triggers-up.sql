-- REMOVE deleted COLUMN FROM threads and boards
ALTER TABLE boards DROP COLUMN IF EXISTS deleted;
ALTER TABLE threads DROP COLUMN IF EXISTS deleted;

-- Posts Constraints
ALTER TABLE posts DROP CONSTRAINT posts_thread_id_fk, ADD CONSTRAINT posts_thread_id_fk FOREIGN KEY (thread_id) REFERENCES threads (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE posts DROP CONSTRAINT posts_user_id_fk, ADD CONSTRAINT posts_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Threads Constraints
ALTER TABLE threads DROP CONSTRAINT threads_board_id_fk, ADD CONSTRAINT threads_board_id_fk FOREIGN KEY (board_id) REFERENCES boards (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE metadata.threads DROP CONSTRAINT threads_thread_id_fk, ADD CONSTRAINT threads_thread_id_fk FOREIGN KEY (thread_id) REFERENCES threads (id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Boards Constraints
ALTER TABLE metadata.boards DROP CONSTRAINT boards_board_id_fk, ADD CONSTRAINT boards_board_id_fk FOREIGN KEY (board_id) REFERENCES boards (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE metadata.boards ADD CONSTRAINT boards_last_thread_id_fk FOREIGN KEY (last_thread_id)  REFERENCES threads (id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Users Constraints
ALTER TABLE users.thread_views DROP CONSTRAINT thread_views_thread_id_fk, ADD CONSTRAINT thread_views_thread_id_fk FOREIGN KEY (thread_id) REFERENCES threads (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE users.thread_views DROP CONSTRAINT thread_views_user_id_fk, ADD CONSTRAINT thread_views_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE users.profiles DROP CONSTRAINT profiles_user_id_fk, ADD CONSTRAINT profiles_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Posts Create
CREATE OR REPLACE FUNCTION create_post() RETURNS TRIGGER AS $create_post$
  BEGIN
    -- increment users.profiles' post_count
    UPDATE users.profiles SET post_count = post_count + 1 WHERE user_id = NEW.user_id;

    -- increment metadata.threads' post_count
    UPDATE metadata.threads SET post_count = post_count + 1 WHERE thread_id = NEW.thread_id;

    -- update thread's created_at
    UPDATE threads SET created_at = (SELECT created_at FROM posts WHERE thread_id = NEW.thread_id ORDER BY created_at limit 1) WHERE id = NEW.thread_id;

    -- update thread's updated_at
    UPDATE threads SET updated_at = (SELECT created_at FROM posts WHERE thread_id = NEW.thread_id ORDER BY created_at DESC limit 1) WHERE id = NEW.thread_id;

    RETURN NEW;
  END;
$create_post$ LANGUAGE plpgsql;
CREATE TRIGGER create_post_trigger
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE PROCEDURE create_post();

CREATE TRIGGER unhide_post_trigger
  AFTER UPDATE
  ON posts
  WHEN (OLD.deleted = true AND NEW.deleted = false)
  FOR EACH ROW
  EXECUTE PROCEDURE create_post();

-- Posts Delete
CREATE OR REPLACE FUNCTION delete_post() RETURNS TRIGGER AS $delete_post$
  BEGIN
    -- decrement users.profiles' post_count
    UPDATE users.profiles SET post_count = post_count - 1 WHERE user_id = OLD.user_id;

    -- decrement metadata.threads' post_count (-1)
    UPDATE metadata.threads SET post_count = post_count - 1 WHERE thread_id = OLD.thread_id;

    -- update thread's updated_at to last post available
    UPDATE threads SET updated_at = (SELECT created_at FROM posts WHERE thread_id = OLD.thread_id ORDER BY created_at DESC limit 1) WHERE id = OLD.thread_id;

    RETURN OLD;
  END;
$delete_post$ LANGUAGE plpgsql;
CREATE TRIGGER delete_post_trigger
  AFTER DELETE ON posts
  FOR EACH ROW
  EXECUTE PROCEDURE delete_post();

CREATE TRIGGER hide_post_trigger
  AFTER UPDATE
  ON posts
  WHEN (OLD.deleted = false AND NEW.deleted = true)
  FOR EACH ROW
  EXECUTE PROCEDURE delete_post();

-- Threads Create
CREATE OR REPLACE FUNCTION create_thread() RETURNS TRIGGER AS $create_thread$
  BEGIN
    -- increment metadata.boards' thread_count
    UPDATE metadata.boards SET thread_count = thread_count + 1 WHERE board_id = NEW.board_id;

    RETURN NEW;
  END;
$create_thread$ LANGUAGE plpgsql;
CREATE TRIGGER create_thread_trigger
  AFTER INSERT ON threads
  FOR EACH ROW
  EXECUTE PROCEDURE create_thread();

-- Threads Delete
CREATE OR REPLACE FUNCTION pre_delete_thread() RETURNS TRIGGER AS $pre_delete_thread$
  DECLARE
    threadPostCount integer;
  BEGIN
    -- set post_count from metadata.threads
    SELECT post_count INTO threadPostCount FROM metadata.threads WHERE thread_id = OLD.id;

    -- decrement metadata.boards' thread_count and post_count
    UPDATE metadata.boards SET post_count = post_count - threadPostCount WHERE board_id = OLD.board_id;

    RETURN OLD;
  END;
$pre_delete_thread$ LANGUAGE plpgsql;
CREATE TRIGGER pre_delete_thread_trigger
  BEFORE DELETE ON threads
  FOR EACH ROW
  EXECUTE PROCEDURE pre_delete_thread();

CREATE OR REPLACE FUNCTION post_delete_thread() RETURNS TRIGGER AS $post_delete_thread$
  BEGIN
    -- decrement metadata.boards' thread_count
    UPDATE metadata.boards SET thread_count = thread_count - 1 WHERE board_id = OLD.board_id;
    -- update metadata.boards' last post information
    UPDATE metadata.boards SET last_post_username = username, last_post_created_at = created_at, last_thread_id = thread_id, last_thread_title = title FROM (SELECT post.username as username, post.created_at as created_at, t.id as thread_id, post.title as title FROM ( SELECT id FROM threads WHERE board_id = OLD.board_id ORDER BY updated_at DESC LIMIT 1 ) t LEFT JOIN LATERAL ( SELECT u.username, p.created_at, p.title FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.thread_id = t.id ORDER BY p.created_at LIMIT 1 ) post ON true) AS subquery WHERE board_id = OLD.board_id;

    RETURN OLD;
  END;
$post_delete_thread$ LANGUAGE plpgsql;
CREATE TRIGGER post_delete_thread_trigger
  AFTER DELETE ON threads
  FOR EACH ROW
  EXECUTE PROCEDURE post_delete_thread();

-- metadata.threads Update
CREATE OR REPLACE FUNCTION update_meta_thread() RETURNS TRIGGER AS $update_meta_thread$
  DECLARE
    boardId uuid;
  BEGIN
    -- set boardId
    SELECT board_id INTO boardId FROM threads WHERE id = OLD.thread_id;

    -- update metadta.board' post_count
    IF OLD.post_count < NEW.post_count THEN
      UPDATE metadata.boards SET post_count = post_count + 1 WHERE board_id = boardId;
    ELSE
      UPDATE metadata.boards SET post_count = post_count - 1 WHERE board_id = boardId;
    END IF;

    -- update metadata.boards' last post information
    UPDATE metadata.boards SET last_post_username = username, last_post_created_at = created_at, last_thread_id = thread_id, last_thread_title = title FROM (SELECT post.username as username, post.created_at as created_at, t.id as thread_id, post.title as title FROM ( SELECT id FROM threads WHERE board_id = boardId ORDER BY updated_at DESC LIMIT 1 ) t LEFT JOIN LATERAL ( SELECT u.username, p.created_at, p.title FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.thread_id = t.id ORDER BY p.created_at LIMIT 1 ) post ON true) AS subquery WHERE board_id = boardId;

    RETURN NEW;
  END;
$update_meta_thread$ LANGUAGE plpgsql;
CREATE TRIGGER update_meta_thread_trigger
  AFTER UPDATE OF post_count ON metadata.threads
  FOR EACH ROW
  EXECUTE PROCEDURE update_meta_thread();
