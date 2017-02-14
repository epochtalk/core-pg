CREATE TRIGGER unhide_post_trigger
  AFTER UPDATE
  ON posts
  FOR EACH ROW
  WHEN (OLD.deleted = true AND NEW.deleted = false)
  EXECUTE PROCEDURE create_post();

CREATE TRIGGER hide_post_trigger
  AFTER UPDATE
  ON posts
  FOR EACH ROW
  WHEN (OLD.deleted = false AND NEW.deleted = true)
  EXECUTE PROCEDURE delete_post();
