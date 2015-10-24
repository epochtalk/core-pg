CREATE TABLE configurations (
  -- general
  log_enabled boolean NOT NULL,
  private_key character varying(255) NOT NULL,
  verify_registration boolean NOT NULL,
  login_required boolean NOT NULL,
  -- weebsite
  website_title character varying(255) NOT NULL,
  website_description text NOT NULL,
  website_keywords text NOT NULL,
  website_logo character varying(2000) NOT NULL,
  website_favicon character varying(2000) NOT NULL,
  -- emailer
  emailer_sender character varying(255) NOT NULL,
  emailer_host character varying(2000) NOT NULL,
  emailer_port integer NOT NULL,
  emailer_user character varying(255) NOT NULL,
  emailer_pass character varying(255) NOT NULL,
  emailer_secure boolean NOT NULL,
  -- images
  images_storage character varying(255) NOT NULL,
  images_max_size integer NOT NULL,
  images_expiration integer NOT NULL,
  images_interval integer NOT NULL,
  images_local_dir character varying(255) NOT NULL,
  images_local_path character varying(255) NOT NULL,
  images_s3_root character varying(2000) NOT NULL,
  images_s3_dir character varying(255) NOT NULL,
  images_s3_bucket character varying(255) NOT NULL,
  images_s3_region character varying(255) NOT NULL,
  images_s3_access_key character varying(255) NOT NULL,
  images_s3_secret_key character varying(255) NOT NULL
);
CREATE UNIQUE INDEX configurations_one_row
ON configurations((log_enabled IS NOT NULL));
