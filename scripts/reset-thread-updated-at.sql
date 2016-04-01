-- Function that resets updated_at for Threads
CREATE OR REPLACE FUNCTION reset_thread_updated_at() RETURNS VOID AS $$
DECLARE
  threadRecord RECORD;
  count integer := 1;
BEGIN
  FOR threadRecord IN SELECT id FROM threads LOOP
    UPDATE threads
    SET updated_at = sub.created_at
    FROM ( SELECT created_at FROM posts WHERE thread_id = threadRecord.id ORDER BY created_at DESC LIMIT 1 ) sub
    WHERE id = threadRecord.id;

    RAISE NOTICE 'Processed % Threads', count;
    count := count + 1;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql;
