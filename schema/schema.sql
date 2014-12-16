CREATE EXTENSION "uuid-ossp";
CREATE TABLE users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email character varying(255) DEFAULT ''::character varying NOT NULL,
  username character varying(50) DEFAULT ''::character varying NOT NULL,
  passhash character varying(255) DEFAULT ''::character varying NOT NULL, 
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  imported_at timestamp without time zone,
  smf_id_member integer NOT NULL
);

CREATE UNIQUE INDEX index_users_on_email ON users USING btree (email);
CREATE UNIQUE INDEX index_users_on_username ON users USING btree (username);
CREATE UNIQUE INDEX index_users_on_smf_id_member ON users USING btree (smf_id_member);

CREATE TABLE categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  view_order integer,
  smf_id_cat integer NOT NULL
);

CREATE UNIQUE INDEX index_categories_on_smf_id_cat ON categories USING btree (smf_id_cat);

CREATE TABLE boards (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_board_id uuid,
  category_id uuid,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  description text DEFAULT '' NOT NULL, 
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  imported_at timestamp without time zone,
  smf_id_board integer NOT NULL,
  smf_id_cat integer NOT NULL,
  FOREIGN KEY (parent_board_id) REFERENCES boards(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE UNIQUE INDEX index_boards_on_smf_id_board ON boards USING btree (smf_id_board);

CREATE TABLE threads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id uuid,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  imported_at timestamp without time zone,
  smf_id_topic integer NOT NULL,
  smf_id_board integer NOT NULL,
  FOREIGN KEY (board_id) REFERENCES boards(id)
);

CREATE INDEX index_threads_on_board_id ON threads USING btree (board_id);
CREATE UNIQUE INDEX index_threads_on_smf_id_topic ON threads USING btree (smf_id_topic);
CREATE INDEX index_threads_on_smf_id_board ON threads USING btree (smf_id_board);

CREATE TABLE posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id uuid,
  user_id uuid,
  title character varying(255) DEFAULT ''::character varying NOT NULL,
  body text DEFAULT '' NOT NULL, 
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  imported_at timestamp without time zone,
  smf_id_msg integer NOT NULL,
  smf_id_topic integer NOT NULL,
  smf_id_member integer NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES threads(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX index_posts_on_thread_id ON posts USING btree (thread_id);
CREATE INDEX index_posts_on_user_id ON posts USING btree (user_id);
CREATE UNIQUE INDEX index_posts_on_smf_id_msg ON posts USING btree (smf_id_msg);
CREATE INDEX index_posts_on_smf_id_topic ON posts USING btree (smf_id_topic);
