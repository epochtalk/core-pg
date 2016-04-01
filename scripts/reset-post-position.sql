UPDATE posts p
SET position = sub.position
FROM (
  SELECT id, row_number() over (order by created_at) as position FROM posts
) as sub
WHERE p.id = sub.id;
