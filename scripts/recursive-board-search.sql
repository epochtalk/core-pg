recursive search for cat id

WITH RECURSIVE find_parent(board_id, parent_id, category_id) AS (
    SELECT bm.board_id, bm.parent_id, bm.category_id
    FROM board_mapping bm where board_id = '133bc94a-61af-4daf-8b1d-4d2c72c62b8e'
  UNION
    SELECT bm.board_id, bm.parent_id, bm.category_id
    FROM board_mapping bm, find_parent fp
    WHERE bm.board_id = fp.parent_id
)
SELECT fp.board_id, fp.parent_id, fp.category_id, b.viewable_by as board_viewable, c.viewable_by as cat_viewable
FROM find_parent fp
LEFT JOIN boards b on fp.board_id = b.id
LEFT JOIN categories c on fp.category_id = c.id;
