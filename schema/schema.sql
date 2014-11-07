CREATE EXTENSION "uuid-ossp";
CREATE TABLE users (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  email character varying(255) DEFAULT ''::character varying NOT NULL,
  username character varying(50) DEFAULT ''::character varying NOT NULL,
  passhash character varying(255) DEFAULT ''::character varying NOT NULL, 
  created_at timestamp without time zone,
  updated_at timestamp without time zone
);

INSERT INTO users(email, username, passhash) values('jw@epoch.im', 'wangbus', 'testing1');
INSERT INTO users(email, username, passhash) values('julie@epoch.im', 'jsakuda', 'testing2');
INSERT INTO users(email, username, passhash) values('ed@epoch.im', 'taesup', 'testing3');
INSERT INTO users(email, username, passhash) values('anthony@epoch.im', 'akinsey', 'testing4');
