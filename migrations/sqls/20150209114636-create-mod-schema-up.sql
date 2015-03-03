CREATE SCHEMA mod;

CREATE TABLE mod.reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid,
  thread_id uuid,
  post_id uuid,
  reason_subject character varying(255),
  reason_body text DEFAULT '',
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
);

CREATE TABLE mod.notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  moderator_id uuid,
  subject character varying(255),
  body text DEFAULT '',
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
);
