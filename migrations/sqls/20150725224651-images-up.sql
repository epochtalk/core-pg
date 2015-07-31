CREATE TABLE image_expirations (
  expiration timestamp with time zone,
  image_url text NOT NULL
);
CREATE INDEX index_image_expirations_on_expiration ON image_expirations (expiration);
CREATE INDEX index_image_expirations_on_image_url ON image_expirations (image_url);

CREATE TABLE images_posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id uuid REFERENCES posts (id) ON DELETE SET NULL,
  image_url text NOT NULL
);
CREATE INDEX index_images_posts_on_post_id ON images_posts (post_id);
CREATE INDEX index_images_posts_on_image_url ON images_posts (image_url);
