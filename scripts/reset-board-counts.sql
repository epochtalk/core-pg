-- Function that resets post_count and thread_count for Boards
-- For an accurate count, run the reset_thread_counts function first
CREATE OR REPLACE FUNCTION reset_board_counts() RETURNS VOID AS $$
DECLARE
  boardRecord RECORD;
BEGIN
  FOR boardRecord IN SELECT id FROM boards LOOP
    UPDATE boards SET post_count = 0, thread_count = 0 WHERE id = boardRecord.id;

    UPDATE boards
    SET post_count = sub.post_count, thread_count = sub.thread_total
    FROM (
      SELECT count(id) AS thread_total, SUM(post_count) AS post_count
      FROM threads
      WHERE board_id = boardRecord.id
    ) sub
    WHERE id = boardRecord.id;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql;
