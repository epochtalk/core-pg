CREATE TABLE board_mapping (
  board_id uuid REFERENCES boards (id) ON UPDATE CASCADE ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES boards (id) ON UPDATE CASCADE ON DELETE CASCADE,
  category_id uuid REFERENCES categories (id) ON UPDATE CASCADE ON DELETE CASCADE,
  view_order integer NOT NULL
);
CREATE INDEX index_board_mapping_on_board_id ON board_mapping USING btree (board_id);

ALTER TABLE boards DROP COLUMN parent_board_id;
ALTER TABLE boards DROP COLUMN children_ids;
ALTER TABLE boards DROP COLUMN category_id;
ALTER TABLE metadata.boards DROP COLUMN total_post_count;
ALTER TABLE metadata.boards DROP COLUMN total_thread_count;
