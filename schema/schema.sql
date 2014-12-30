-- CREATE EXTENSION "uuid-ossp";
CREATE EXTENSION citext;
CREATE TABLE users (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
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
  id serial PRIMARY KEY,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  description text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE roles_users (
  role_id integer,
  user_id integer
);


CREATE TABLE categories (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  view_order integer,
  imported_at timestamp with time zone
);

CREATE TABLE boards (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  parent_board_id integer,
  children_ids integer[],
  category_id integer,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  description text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
);

CREATE TABLE threads (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  board_id integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
);

CREATE INDEX index_threads_on_board_id ON threads USING btree (board_id);
CREATE INDEX index_threads_on_updated_at ON threads USING btree (updated_at);

CREATE TABLE posts (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  thread_id integer,
  user_id integer,
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
