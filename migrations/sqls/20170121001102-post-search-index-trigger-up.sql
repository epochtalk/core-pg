-- Search Index Posts Create
CREATE OR REPLACE FUNCTION search_index_post() RETURNS TRIGGER AS $search_index_post$
  BEGIN
    -- increment users.profiles' post_count
    UPDATE posts SET
        tsv = x.tsv
    FROM (
        SELECT id,
               setweight(to_tsvector('simple', COALESCE(title,'')), 'A') ||
               setweight(to_tsvector('simple', COALESCE(body,'')), 'B')
               AS tsv
         FROM posts WHERE id = NEW.id
    ) AS x
    WHERE x.id = posts.id;

    RETURN NEW;
  END;

$search_index_post$ LANGUAGE plpgsql;

CREATE TRIGGER search_index_post
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE PROCEDURE search_index_post();

UPDATE posts SET
    tsv = x.tsv
FROM (
    SELECT id,
           setweight(to_tsvector('simple', COALESCE(title,'')), 'A') ||
           setweight(to_tsvector('simple', COALESCE(body,'')), 'B')
           AS tsv
     FROM posts WHERE tsv IS NULL
) AS x
WHERE x.id = posts.id;
