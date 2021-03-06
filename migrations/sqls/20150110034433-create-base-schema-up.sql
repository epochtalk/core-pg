CREATE EXTENSION "uuid-ossp";
CREATE EXTENSION citext;
CREATE TABLE users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email citext CHECK (length(email) <= 255) NOT NULL,
  username citext CHECK (length(username) <= 50) NOT NULL,
  passhash character varying(255),
  confirmation_token character varying(255),
  reset_token character varying(255),
  reset_expiration timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
);

CREATE INDEX index_users_on_email ON users USING btree (email);
CREATE UNIQUE INDEX index_users_on_username ON users USING btree (username);

CREATE TABLE roles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  description text DEFAULT '' NOT NULL,
  permissions json,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE roles_users (
  role_id uuid,
  user_id uuid
);


CREATE TABLE categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  view_order integer,
  imported_at timestamp with time zone
);

CREATE TABLE boards (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_board_id uuid,
  children_ids uuid[],
  category_id uuid,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  description text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
);

CREATE TABLE threads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
);

CREATE INDEX index_threads_on_board_id ON threads USING btree (board_id);
CREATE INDEX index_threads_on_updated_at ON threads USING btree (updated_at);

CREATE TABLE posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id uuid,
  user_id uuid,
  title character varying(255) DEFAULT ''::character varying NOT NULL,
  raw_body text DEFAULT '',
  body text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
);

CREATE INDEX index_posts_on_thread_id ON posts USING btree (thread_id);
CREATE INDEX index_posts_on_user_id ON posts USING btree (user_id);
CREATE INDEX index_posts_on_created_at ON posts USING btree (created_at);

INSERT INTO roles (id, name) VALUES ('edcd8f77-ce34-4433-ba85-17f9b17a3b60', 'User');
INSERT INTO roles (id, name) VALUES ('06860e6f-9ac0-4c2a-8d9c-417343062fb8', 'Administrator');
INSERT INTO roles (id, name) VALUES ('fb0f70b7-3652-4f7d-a166-05ee68e7428d', 'Global Moderator');
INSERT INTO roles (id, name) VALUES ('c0d39771-1541-4b71-9122-af0736cad23d', 'Moderator');
