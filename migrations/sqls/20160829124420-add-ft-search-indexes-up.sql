CREATE MATERIALIZED VIEW fts_index AS 
SELECT p.id,
       p.title,
       p.raw_body,
       setweight(to_tsvector('simple', p.title), 'A') || 
       setweight(to_tsvector('simple', p.raw_body), 'B') as document
FROM posts p
JOIN users u ON u.id = p.user_id
GROUP BY p.id, u.id;

CREATE INDEX idx_ft_search ON fts_index USING gin(document);
