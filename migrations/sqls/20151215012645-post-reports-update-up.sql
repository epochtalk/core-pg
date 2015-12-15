ALTER TABLE administration.reports_posts DROP CONSTRAINT offender_post_id_fk;
ALTER TABLE administration.reports_posts ADD CONSTRAINT offender_post_id_fk FOREIGN KEY (offender_post_id) REFERENCES posts (id) ON DELETE CASCADE;
