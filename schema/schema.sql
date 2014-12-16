-- CREATE EXTENSION "uuid-ossp";
CREATE TABLE users (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  email character varying(255) DEFAULT ''::character varying NOT NULL,
  username character varying(50) DEFAULT ''::character varying NOT NULL,
  passhash character varying(255) DEFAULT ''::character varying NOT NULL, 
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  imported_at timestamp without time zone,
  smf_id_member integer
);

CREATE UNIQUE INDEX index_users_on_email ON users USING btree (email);
CREATE UNIQUE INDEX index_users_on_username ON users USING btree (username);
CREATE UNIQUE INDEX index_users_on_smf_id_member ON users USING btree (smf_id_member);

CREATE TABLE categories (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  view_order integer,
  smf_id_cat integer
);

CREATE UNIQUE INDEX index_categories_on_smf_id_cat ON categories USING btree (smf_id_cat);

CREATE TABLE boards (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  parent_board_id integer,
  category_id integer,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  description text DEFAULT '' NOT NULL, 
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  imported_at timestamp without time zone,
  smf_id_board integer,
  smf_id_cat integer,
  FOREIGN KEY (parent_board_id) REFERENCES boards(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE UNIQUE INDEX index_boards_on_smf_id_board ON boards USING btree (smf_id_board);

CREATE TABLE threads (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  board_id integer,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  imported_at timestamp without time zone,
  smf_id_topic integer,
  smf_id_board integer,
  FOREIGN KEY (board_id) REFERENCES boards(id)
);

CREATE INDEX index_threads_on_board_id ON threads USING btree (board_id);
CREATE UNIQUE INDEX index_threads_on_smf_id_topic ON threads USING btree (smf_id_topic);
CREATE INDEX index_threads_on_smf_id_board ON threads USING btree (smf_id_board);

CREATE TABLE posts (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  thread_id integer,
  user_id integer,
  title character varying(255) DEFAULT ''::character varying NOT NULL,
  body text DEFAULT '' NOT NULL, 
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  imported_at timestamp without time zone,
  smf_id_msg integer,
  smf_id_topic integer,
  smf_id_member integer,
  FOREIGN KEY (thread_id) REFERENCES threads(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX index_posts_on_thread_id ON posts USING btree (thread_id);
CREATE INDEX index_posts_on_user_id ON posts USING btree (user_id);
CREATE UNIQUE INDEX index_posts_on_smf_id_msg ON posts USING btree (smf_id_msg);
CREATE INDEX index_posts_on_smf_id_topic ON posts USING btree (smf_id_topic);

-- INSERT INTO categories (name) VALUES ('Example Category 1') RETURNING id;
-- INSERT INTO categories (name) VALUES ('Example Category 2') RETURNING id;
-- INSERT INTO categories (name) VALUES ('Example Category 3') RETURNING id;
-- INSERT INTO categories (name) VALUES ('Example Category 4') RETURNING id;
-- INSERT INTO categories (name) VALUES ('Example Category 5') RETURNING id;
-- INSERT INTO boards (category_id, name, description) VALUES (LASTVAL(), 'General', 'General Board') RETURNING id;
-- INSERT INTO threads (board_id) VALUES (LASTVAL()) RETURNING id;
-- INSERT INTO posts (thread_id, title, body) VALUES (LASTVAL(), 'Hello World', 'This is an example post.') RETURNING id;
