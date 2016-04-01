-- Function that resets post_count for Threads
CREATE OR REPLACE FUNCTION reset_thread_counts() RETURNS VOID AS $$
DECLARE
  threadRecord RECORD;
  count integer := 1;
BEGIN
  FOR threadRecord IN SELECT id FROM threads LOOP
    UPDATE threads
    SET post_count = sub.total
    FROM ( SELECT count(id) AS total FROM posts WHERE thread_id = threadRecord.id ) sub
    WHERE id = threadRecord.id;

    RAISE NOTICE 'Processed % Threads', count;
    count := count + 1;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql;
