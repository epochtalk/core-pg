# Watchlist
SELECT t.id
FROM users.watch_threads wt
LEFT JOIN threads t ON wt.thread_id = t.id
WHERE wt.user_id = '00000000-0000-0000-0000-000000033345'
AND t.updated_at IS NOT NULL
ORDER BY t.updated_at DESC LIMIT 25;

# FAST
select i.id, i.updated_at from (
  select board_id from users.watch_boards where user_id = '00000000-0000-0000-0000-000000033345'
) b left join lateral (
  select t.id, t.updated_at
  from threads t
  where t.board_id = b.board_id
  and t.updated_at is not null
  order by t.updated_at desc limit 25
) i on true;

#Trial morning
select z.id from (
  select id, updated_at FROM (
    SELECT t.id, t.updated_at
    FROM users.watch_threads wt
    LEFT JOIN threads t ON wt.thread_id = t.id
    WHERE wt.user_id = '00000000-0000-0000-0000-000000033345'
    AND t.updated_at IS NOT NULL
    order by updated_at desc limit 50
  ) t
  union
  select i1.id, i1.updated_at from (
    select board_id from users.watch_boards where user_id = '00000000-0000-0000-0000-000000033345'
  ) b left join lateral (
    select id, updated_at
    from threads t
    where t.board_id = b.board_id
    and t.updated_at is not null
    order by updated_at desc limit 50
  ) i1 on true
) z
order by z.updated_at desc limit 25 offset 25;


# watchlist (fatest)
SELECT tlist.id, t.locked, t.sticky, t.created_at, t.updated_at, t.views as view_count, t.post_count, p.title, p.user_id, p.username, p.user_deleted, t.time AS last_viewed, tv.id AS post_id, tv.position AS post_position, pl.last_post_id, pl.position AS last_post_position, pl.created_at AS last_post_created_at, pl.deleted AS last_post_deleted, pl.id AS last_post_user_id, pl.username AS last_post_username, pl.user_deleted AS last_post_user_deleted
FROM (
  SELECT z.id FROM (
    SELECT id, updated_at FROM (
      SELECT t.id, t.updated_at
      FROM users.watch_threads wt
      LEFT JOIN users.thread_views tv ON wt.thread_id = tv.thread_id AND wt.user_id = tv.user_id
      LEFT JOIN threads t ON wt.thread_id = t.id
      WHERE wt.user_id = '00000000-0000-0000-0000-000000033345'
      AND t.updated_at IS NOT NULL
      AND (t.updated_at >= tv.time OR tv.time IS NULL)
      ORDER BY updated_at desc limit 25
    ) t
    UNION
    SELECT i1.id, i1.updated_at FROM (
      SELECT board_id
      FROM users.watch_boards
      WHERE user_id = '00000000-0000-0000-0000-000000033345'
    ) b LEFT JOIN LATERAL (
      SELECT id, updated_at
      FROM threads t
      LEFT JOIN users.thread_views tv ON t.id = tv.thread_id AND tv.user_id = '00000000-0000-0000-0000-000000033345'
      WHERE t.board_id = b.board_id
      AND t.updated_at IS NOT NULL
      AND (t.updated_at >= tv.time OR tv.time IS NULL)
      ORDER BY updated_at DESC LIMIT 25
    ) i1 ON true
  ) z
  order by z.updated_at desc limit 25 offset 0
) tlist LEFT JOIN LATERAL (
  SELECT t1.locked, t1.sticky, t1.post_count, t1.created_at, t1.updated_at, mt.views,
  (SELECT time FROM users.thread_views WHERE thread_id = tlist.id AND user_id = '00000000-0000-0000-0000-000000033345')
  FROM threads t1 LEFT JOIN metadata.threads mt ON tlist.id = mt.thread_id
  WHERE t1.id = tlist.id
) t ON true LEFT JOIN LATERAL (
  SELECT p1.title, p1.user_id, u.username, u.deleted as user_deleted
  FROM posts p1 LEFT JOIN users u ON p1.user_id = u.id
  WHERE p1.thread_id = tlist.id ORDER BY p1.created_at LIMIT 1
) p ON true LEFT JOIN LATERAL (
  SELECT id, position FROM posts WHERE thread_id = tlist.id AND created_at >= t.time ORDER BY created_at LIMIT 1
) tv ON true LEFT JOIN LATERAL (
  SELECT p.id AS last_post_id, p.position, p.created_at, p.deleted, u.id, u.username, u.deleted as user_deleted FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.thread_id = tlist.id ORDER BY p.created_at DESC LIMIT 1
) pl ON true;
# -- WATCHLIST END --



# Posted (fastest)
SELECT tlist.id, t.locked, t.sticky, t.moderated, t.poll, t.board_name, t.board_id, t.created_at, t.updated_at, t.views as view_count, t.post_count, p.title, p.user_id, p.username, p.user_deleted, t.time AS last_viewed, tv.id AS post_id, tv.position AS post_position, pl.last_post_id, pl.position AS last_post_position, pl.created_at AS last_post_created_at, pl.deleted AS last_post_deleted, pl.id AS last_post_user_id, pl.username AS last_post_username, pl.user_deleted AS last_post_user_deleted
FROM (
  SELECT temp.id FROM (
    SELECT DISTINCT (p.thread_id) AS id
    FROM posts p
    WHERE p.user_id = '00000000-0000-0000-0000-00000000a058'
  ) AS temp
  LEFT JOIN threads t ON temp.id = t.id
  WHERE EXISTS (
    SELECT 1
    FROM boards b
    WHERE b.id = t.board_id AND (b.viewable_by IS NULL OR b.viewable_by >= 4)
  )
  ORDER BY t.updated_at DESC
  LIMIT 25
) tlist
LEFT JOIN LATERAL (
  SELECT t1.locked, t1.sticky, t1.moderated, t1.post_count, t1.created_at, t1.updated_at, mt.views,
  (SELECT EXISTS ( SELECT 1 FROM polls WHERE thread_id = tlist.id )) as poll,
  (SELECT time FROM users.thread_views WHERE thread_id = tlist.id AND user_id = '00000000-0000-0000-0000-00000000a058'),
  (SELECT b.name FROM boards b WHERE b.id = t1.board_id) as board_name,
  (SELECT b.id FROM boards b WHERE b.id = t1.board_id) as board_id
  FROM threads t1
  LEFT JOIN metadata.threads mt ON tlist.id = mt.thread_id
  WHERE t1.id = tlist.id
) t ON true
LEFT JOIN LATERAL (
  SELECT p1.title, p1.user_id, u.username, u.deleted as user_deleted
  FROM posts p1
  LEFT JOIN users u ON p1.user_id = u.id
  WHERE p1.thread_id = tlist.id
  ORDER BY p1.created_at LIMIT 1
) p ON true
LEFT JOIN LATERAL (
  SELECT id, position
  FROM posts
  WHERE thread_id = tlist.id AND created_at >= t.time
  ORDER BY created_at LIMIT 1
) tv ON true
LEFT JOIN LATERAL (
  SELECT p.id AS last_post_id, p.position, p.created_at, p.deleted, u.id, u.username, u.deleted as user_deleted
  FROM posts p LEFT JOIN users u ON p.user_id = u.id
  WHERE p.thread_id = tlist.id
  ORDER BY p.created_at DESC LIMIT 1
) pl ON true;



CREATE INDEX index_posts_on_user_id_and_thread_id ON posts (user_id, thread_id);



# Max user post counts
select  max(post_count) as total, user_id FROM users.profiles group by user_id order by total DESC;
# 22381 | 00000000-0000-0000-0000-0000000060d8
# 17239 | 00000000-0000-0000-0000-0000000020c5
# 16625 | 00000000-0000-0000-0000-00000000a058
# 16082 | 00000000-0000-0000-0000-000000005b1c
# 15794 | 00000000-0000-0000-0000-000000005af1
# 15172 | 00000000-0000-0000-0000-00000001b05d
# 14754 | 00000000-0000-0000-0000-0000000283d6
# 14642 | 00000000-0000-0000-0000-000000006568
# 13832 | 00000000-0000-0000-0000-00000000acc9
# 10926 | 00000000-0000-0000-0000-0000000011fa
# 10611 | 00000000-0000-0000-0000-00000000b5dc
# 10484 | 00000000-0000-0000-0000-0000000183e1
# 10041 | 00000000-0000-0000-0000-000000026b29
# 10021 | 00000000-0000-0000-0000-000000000ebb
