/* Replace with your SQL commands */
CREATE TABLE auto_moderation (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name character varying(255) NOT NULL,
  description character varying(1000),
  message character varying(1000),
  conditions json NOT NULL,
  actions json NOT NULL,
  options json,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
