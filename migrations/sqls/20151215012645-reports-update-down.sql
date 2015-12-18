/* Post Reports */
DELETE FROM administration.reports_posts WHERE reporter_user_id IS NULL;

ALTER TABLE administration.reports_posts ALTER COLUMN reporter_user_id SET NOT NULL;

ALTER TABLE administration.reports_posts DROP CONSTRAINT offender_post_id_fk;
ALTER TABLE administration.reports_posts DROP CONSTRAINT reporter_user_id_fk;
ALTER TABLE administration.reports_posts DROP CONSTRAINT reviewer_user_id_fk;

ALTER TABLE administration.reports_posts ADD CONSTRAINT offender_post_id_fk FOREIGN KEY (offender_post_id) REFERENCES posts (id);
ALTER TABLE administration.reports_posts ADD CONSTRAINT reporter_user_id_fk FOREIGN KEY (reporter_user_id) REFERENCES users (id);
ALTER TABLE administration.reports_posts ADD CONSTRAINT reviewer_user_id_fk FOREIGN KEY (reviewer_user_id) REFERENCES users (id);

/* Post Report Notes */
DELETE FROM administration.reports_posts_notes WHERE user_id IS NULL;

ALTER TABLE administration.reports_posts_notes ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE administration.reports_posts_notes DROP CONSTRAINT user_id_fk;

ALTER TABLE administration.reports_posts_notes ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id);

/* User Reports */
DELETE FROM administration.reports_users WHERE reporter_user_id IS NULL;

ALTER TABLE administration.reports_users ALTER COLUMN reporter_user_id SET NOT NULL;

ALTER TABLE administration.reports_users DROP CONSTRAINT offender_user_id_fk;
ALTER TABLE administration.reports_users DROP CONSTRAINT reporter_user_id_fk;
ALTER TABLE administration.reports_users DROP CONSTRAINT reviewer_user_id_fk;

ALTER TABLE administration.reports_users ADD CONSTRAINT offender_user_id_fk FOREIGN KEY (offender_user_id) REFERENCES users (id);
ALTER TABLE administration.reports_users ADD CONSTRAINT reporter_user_id_fk FOREIGN KEY (reporter_user_id) REFERENCES users (id);
ALTER TABLE administration.reports_users ADD CONSTRAINT reviewer_user_id_fk FOREIGN KEY (reviewer_user_id) REFERENCES users (id);

/* User Report Notes */
DELETE FROM administration.reports_users_notes WHERE user_id IS NULL;

ALTER TABLE administration.reports_users_notes ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE administration.reports_users_notes DROP CONSTRAINT user_id_fk;

ALTER TABLE administration.reports_users_notes ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id);

/* Message Reports */
DELETE FROM administration.reports_messages WHERE reporter_user_id IS NULL;

ALTER TABLE administration.reports_messages ALTER COLUMN reporter_user_id SET NOT NULL;

ALTER TABLE administration.reports_messages DROP CONSTRAINT offender_message_id;
ALTER TABLE administration.reports_messages DROP CONSTRAINT reporter_user_id_fk;
ALTER TABLE administration.reports_messages DROP CONSTRAINT reviewer_user_id_fk;

ALTER TABLE administration.reports_messages ADD CONSTRAINT offender_message_id_fk FOREIGN KEY (offender_message_id) REFERENCES private_messages (id);
ALTER TABLE administration.reports_messages ADD CONSTRAINT reporter_user_id_fk FOREIGN KEY (reporter_user_id) REFERENCES users (id);
ALTER TABLE administration.reports_messages ADD CONSTRAINT reviewer_user_id_fk FOREIGN KEY (reviewer_user_id) REFERENCES users (id);

/* Message Report Notes */
DELETE FROM administration.reports_messages_notes WHERE user_id IS NULL;

ALTER TABLE administration.reports_messages_notes ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE administration.reports_messages_notes DROP CONSTRAINT user_id_fk;

ALTER TABLE administration.reports_messages_notes ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id);
