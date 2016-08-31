ALTER TABLE posts ADD COLUMN tsv tsvector;
UPDATE posts SET  
    tsv = x.tsv
FROM (  
    SELECT id,
           setweight(to_tsvector('simple', COALESCE(title,'')), 'A') ||
           setweight(to_tsvector('simple', COALESCE(body,'')), 'B')
           AS tsv
     FROM posts
) AS x
WHERE x.id = posts.id;

CREATE INDEX index_posts_on_tsv ON posts USING gin(tsv);
