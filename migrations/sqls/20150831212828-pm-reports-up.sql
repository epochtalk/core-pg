/* Private Messages Reports */
CREATE TABLE administration.reports_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  status_id integer NOT NULL,
  reporter_user_id uuid NOT NULL,
  reporter_reason text DEFAULT '' NOT NULL,
  reviewer_user_id uuid,
  offender_message_id uuid NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE INDEX index_reports_messages_on_status_id ON administration.reports_messages USING btree (status_id);
CREATE INDEX index_reports_messages_on_created_at ON administration.reports_messages USING btree (created_at);

ALTER TABLE administration.reports_messages ADD CONSTRAINT status_id_fk FOREIGN KEY (status_id) REFERENCES administration.reports_statuses (id);
ALTER TABLE administration.reports_messages ADD CONSTRAINT offender_message_id_fk FOREIGN KEY (offender_message_id) REFERENCES private_messages (id);
ALTER TABLE administration.reports_messages ADD CONSTRAINT reporter_user_id_fk FOREIGN KEY (reporter_user_id) REFERENCES users (id);
ALTER TABLE administration.reports_messages ADD CONSTRAINT reviewer_user_id_fk FOREIGN KEY (reviewer_user_id) REFERENCES users (id);

/* Message Reports Notes */
CREATE TABLE administration.reports_messages_notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id uuid NOT NULL,
  user_id uuid NOT NULL,
  note text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE INDEX index_reports_messages_notes_on_report_id ON administration.reports_messages_notes USING btree (report_id);
CREATE INDEX index_reports_messages_notes_on_created_at ON administration.reports_messages_notes USING btree (created_at);

ALTER TABLE administration.reports_messages_notes ADD CONSTRAINT report_id_fk FOREIGN KEY (report_id) REFERENCES administration.reports_messages (id) ON DELETE CASCADE;
ALTER TABLE administration.reports_messages_notes ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id);
