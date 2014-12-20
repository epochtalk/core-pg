-- CREATE EXTENSION "uuid-ossp";
CREATE TABLE users (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  email character varying(255) NOT NULL,
  username character varying(50) NOT NULL,
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
  category_id integer,
  name character varying(255) DEFAULT ''::character varying NOT NULL,
  description text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
  -- FOREIGN KEY (parent_board_id) REFERENCES boards(id),
  -- FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE threads (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  board_id integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
  -- FOREIGN KEY (board_id) REFERENCES boards(id)
);

CREATE INDEX index_threads_on_board_id ON threads USING btree (board_id);

CREATE TABLE posts (
  -- id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  id serial PRIMARY KEY,
  thread_id integer,
  user_id integer,
  title character varying(255) DEFAULT ''::character varying NOT NULL,
  body text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  imported_at timestamp with time zone
  -- FOREIGN KEY (thread_id) REFERENCES threads(id),
  -- FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX index_posts_on_thread_id ON posts USING btree (thread_id);
CREATE INDEX index_posts_on_user_id ON posts USING btree (user_id);
CREATE INDEX index_posts_on_created_at ON posts USING btree (created_at);

-- INSERT INTO categories (name) VALUES ('Example Category 1') RETURNING id;
-- INSERT INTO categories (name) VALUES ('Example Category 2') RETURNING id;
-- INSERT INTO categories (name) VALUES ('Example Category 3') RETURNING id;
-- INSERT INTO categories (name) VALUES ('Example Category 4') RETURNING id;
-- INSERT INTO categories (name) VALUES ('Example Category 5') RETURNING id;
-- INSERT INTO boards (category_id, name, description) VALUES (LASTVAL(), 'General', 'General Board') RETURNING id;
-- INSERT INTO threads (board_id) VALUES (LASTVAL()) RETURNING id;
-- INSERT INTO posts (thread_id, title, body) VALUES (LASTVAL(), 'Hello World', 'This is an example post.') RETURNING id;
