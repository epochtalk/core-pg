CREATE TABLE blacklist (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  ip_data character varying(100) NOT NULL,
  note character varying(255) NOT NULL
);
