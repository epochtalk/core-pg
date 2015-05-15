CREATE SCHEMA administration;

/* Report Statuses */
CREATE TABLE administration.reports_statuses (
  id serial NOT NULL PRIMARY KEY,
  priority integer NOT NULL,
  status character varying(255) DEFAULT ''::character varying NOT NULL
);

/* Insert report statuses */
INSERT INTO administration.reports_statuses (status, priority) VALUES ('Pending', 1);
INSERT INTO administration.reports_statuses (status, priority) VALUES ('Reviewed', 2);
INSERT INTO administration.reports_statuses (status, priority) VALUES ('Ignored', 3);
INSERT INTO administration.reports_statuses (status, priority) VALUES ('Bad Report', 4);

/* User Reports */
CREATE TABLE administration.reports_users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  status_id integer NOT NULL,
  reporter_user_id uuid NOT NULL,
  reporter_reason text DEFAULT '' NOT NULL,
  reviewer_user_id uuid,
  offender_user_id uuid NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE INDEX index_reports_users_on_status_id ON administration.reports_users USING btree (status_id);
CREATE INDEX index_reports_users_on_created_at ON administration.reports_users USING btree (created_at);

ALTER TABLE administration.reports_users ADD CONSTRAINT status_id_fk FOREIGN KEY (status_id) REFERENCES administration.reports_statuses (id);
ALTER TABLE administration.reports_users ADD CONSTRAINT offender_user_id_fk FOREIGN KEY (offender_user_id) REFERENCES users (id);
ALTER TABLE administration.reports_users ADD CONSTRAINT reporter_user_id_fk FOREIGN KEY (reporter_user_id) REFERENCES users (id);
ALTER TABLE administration.reports_users ADD CONSTRAINT reviewer_user_id_fk FOREIGN KEY (reviewer_user_id) REFERENCES users (id);

/* User Reports Notes */
CREATE TABLE administration.reports_users_notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id uuid NOT NULL,
  user_id uuid NOT NULL,
  note text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE INDEX index_reports_users_notes_on_report_id ON administration.reports_users_notes USING btree (report_id);
CREATE INDEX index_reports_users_notes_on_created_at ON administration.reports_users_notes USING btree (created_at);

ALTER TABLE administration.reports_users_notes ADD CONSTRAINT report_id_fk FOREIGN KEY (report_id) REFERENCES administration.reports_users (id) ON DELETE CASCADE;
ALTER TABLE administration.reports_users_notes ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id);

/* Post Reports */
CREATE TABLE administration.reports_posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  status_id integer NOT NULL,
  reporter_user_id uuid NOT NULL,
  reporter_reason text DEFAULT '' NOT NULL,
  reviewer_user_id uuid,
  offender_post_id uuid NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE INDEX index_reports_posts_on_status_id ON administration.reports_posts USING btree (status_id);
CREATE INDEX index_reports_posts_on_created_at ON administration.reports_posts USING btree (created_at);

ALTER TABLE administration.reports_posts ADD CONSTRAINT status_id_fk FOREIGN KEY (status_id) REFERENCES administration.reports_statuses (id);
ALTER TABLE administration.reports_posts ADD CONSTRAINT offender_post_id_fk FOREIGN KEY (offender_post_id) REFERENCES posts (id);
ALTER TABLE administration.reports_posts ADD CONSTRAINT reporter_user_id_fk FOREIGN KEY (reporter_user_id) REFERENCES users (id);
ALTER TABLE administration.reports_posts ADD CONSTRAINT reviewer_user_id_fk FOREIGN KEY (reviewer_user_id) REFERENCES users (id);

/* Post Reports Notes */
CREATE TABLE administration.reports_posts_notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id uuid NOT NULL,
  user_id uuid NOT NULL,
  note text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE INDEX index_reports_posts_notes_on_report_id ON administration.reports_posts_notes USING btree (report_id);
CREATE INDEX index_reports_posts_notes_on_created_at ON administration.reports_posts_notes USING btree (created_at);

ALTER TABLE administration.reports_posts_notes ADD CONSTRAINT report_id_fk FOREIGN KEY (report_id) REFERENCES administration.reports_posts (id) ON DELETE CASCADE;
ALTER TABLE administration.reports_posts_notes ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id);
