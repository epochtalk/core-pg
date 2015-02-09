CREATE SCHEMA mod;

CREATE TABLE mod.reports (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  user_id integer,
  thread_id integer,
  post_id integer,
  reason_subject character varying(255),
  reason_body text DEFAULT '',
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
);

CREATE TABLE mod.notes (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  moderator_id integer,
  subject character varying(255),
  body text DEFAULT '',
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
);
