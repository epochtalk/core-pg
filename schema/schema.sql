CREATE EXTENSION "uuid-ossp";
CREATE TABLE users (
  id uuid NOT NULL,
  email character varying(255) DEFAULT ''::character varying NOT NULL,
  username character varying(50) DEFAULT ''::character varying NOT NULL,
  encrypted_password character varying(50) DEFAULT ''::character varying NOT NULL
);

INSERT INTO users values(uuid_generate_v4(), 'jw@epoch.im', 'wangbus', 'testing1');
INSERT INTO users values(uuid_generate_v4(), 'julie@epoch.im', 'jsakuda', 'testing2');
INSERT INTO users values(uuid_generate_v4(), 'ed@epoch.im', 'taesup', 'testing3');
INSERT INTO users values(uuid_generate_v4(), 'anthony@epoch.im', 'akinsey', 'testing4');
