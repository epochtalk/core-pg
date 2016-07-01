CREATE SCHEMA ads;

CREATE TABLE ads.rounds (
  round SERIAL PRIMARY KEY,
  current boolean DEFAULT false,
  start_time timestamp with time zone,
  end_time timestamp with time zone
);

CREATE TABLE ads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  round integer NOT NULL,
  html text NOT NULL,
  css text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
CREATE INDEX index_ads_on_round ON ads USING btree (round);
CREATE INDEX index_ads_on_created_at ON ads USING btree (created_at);

CREATE TABLE ads.analytics (
  ad_id uuid REFERENCES ads ON DELETE CASCADE PRIMARY KEY,
  total_impressions integer DEFAULT 0 NOT NULL,
  total_authed_impressions integer DEFAULT 0 NOT NULL,
  total_unique_ip_impressions integer DEFAULT 0 NOT NULL,
  total_unique_authed_users_impressions integer DEFAULT 0 NOT NULL
);

CREATE TABLE ads.unique_ip (
  ad_id uuid REFERENCES ads ON DELETE CASCADE NOT NULL,
  unique_ip character varying (255) NOT NULL
);
CREATE INDEX index_ads_unique_ip_on_ad_id ON ads.unique_ip USING btree (ad_id);
CREATE UNIQUE INDEX index_ads_unique_ip_on_ad_id_and_unique_ip ON ads.unique_ip USING btree(ad_id, unique_ip);

-- Update unique ip trigger
CREATE OR REPLACE FUNCTION update_unique_ip_score_on_ad() RETURNS TRIGGER AS $update_unique_ip_score_on_ad$
  BEGIN
    -- increment total_unique_ip_impressions
    UPDATE ads.analytics SET total_unique_ip_impressions = total_unique_ip_impressions + 1 WHERE ad_id = NEW.ad_id;

    RETURN NEW;
  END;
$update_unique_ip_score_on_ad$ LANGUAGE plpgsql;
CREATE TRIGGER update_unique_ip_score_on_ad_trigger
  AFTER INSERT ON ads.unique_ip
  FOR EACH ROW
  EXECUTE PROCEDURE update_unique_ip_score_on_ad();

CREATE TABLE ads.authed_users (
  ad_id uuid REFERENCES ads ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users ON DELETE SET NULL NOT NULL
);
CREATE INDEX index_ads_authed_users_on_ad_id ON ads.authed_users USING btree (ad_id);
CREATE UNIQUE INDEX index_ads_authed_users_on_ad_id_and_user_id ON ads.authed_users USING btree(ad_id, user_id);

-- Update unique authed user trigger
CREATE OR REPLACE FUNCTION update_unique_authed_user_score_on_ad() RETURNS TRIGGER AS $update_unique_authed_user_score_on_ad$
  BEGIN
    -- increment total_unique_authed_users_impressions
    UPDATE ads.analytics SET total_unique_authed_users_impressions = total_unique_authed_users_impressions + 1 WHERE ad_id = NEW.ad_id;

    RETURN NEW;
  END;
$update_unique_authed_user_score_on_ad$ LANGUAGE plpgsql;
CREATE TRIGGER update_unique_authed_user_score_on_ad_trigger
  AFTER INSERT ON ads.authed_users
  FOR EACH ROW
  EXECUTE PROCEDURE update_unique_authed_user_score_on_ad();



CREATE SCHEMA factoids;

CREATE TABLE factoids (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  text text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
CREATE INDEX index_factoids_on_created_at ON factoids USING btree (created_at);
CREATE INDEX index_factoids_on_enabled ON factoids USING btree (enabled);

CREATE TABLE factoids.analytics (
  round integer PRIMARY KEY,
  total_impressions integer DEFAULT 0 NOT NULL,
  total_authed_impressions integer DEFAULT 0 NOT NULL,
  total_unique_ip_impressions integer DEFAULT 0 NOT NULL,
  total_unique_authed_users_impressions integer DEFAULT 0 NOT NULL
);

CREATE TABLE factoids.unique_ip (
  round integer NOT NULL,
  unique_ip character varying (255) NOT NULL
);
CREATE INDEX index_factoids_unique_ip_on_round ON factoids.unique_ip USING btree (round);
CREATE UNIQUE INDEX index_factoids_unique_ip_on_round_and_unique_ip ON factoids.unique_ip USING btree(round, unique_ip);

-- Update unique ip trigger
CREATE OR REPLACE FUNCTION update_unique_ip_score_on_factoids() RETURNS TRIGGER AS $update_unique_ip_score_on_factoids$
  BEGIN
    -- increment total_unique_ip_impressions
    UPDATE factoids.analytics SET total_unique_ip_impressions = total_unique_ip_impressions + 1 WHERE round = NEW.round;

    RETURN NEW;
  END;
$update_unique_ip_score_on_factoids$ LANGUAGE plpgsql;
CREATE TRIGGER update_unique_ip_score_on_factoid_trigger
  AFTER INSERT ON factoids.unique_ip
  FOR EACH ROW
  EXECUTE PROCEDURE update_unique_ip_score_on_factoids();

CREATE TABLE factoids.authed_users (
  round integer NOT NULL,
  user_id uuid REFERENCES users ON DELETE SET NULL NOT NULL
);
CREATE INDEX index_factoids_authed_users_on_round ON factoids.authed_users USING btree (round);
CREATE UNIQUE INDEX index_factoids_authed_users_on_round_and_user_id ON factoids.authed_users USING btree(round, user_id);

-- Update unique authed user trigger
CREATE OR REPLACE FUNCTION update_unique_authed_user_score_on_factoid() RETURNS TRIGGER AS $update_unique_authed_user_score_on_factoid$
  BEGIN
    -- increment total_unique_authed_users_impressions
    UPDATE factoids.analytics SET total_unique_authed_users_impressions = total_unique_authed_users_impressions + 1 WHERE round = NEW.round;

    RETURN NEW;
  END;
$update_unique_authed_user_score_on_factoid$ LANGUAGE plpgsql;
CREATE TRIGGER update_unique_authed_user_score_on_factoid_trigger
  AFTER INSERT ON factoids.authed_users
  FOR EACH ROW
  EXECUTE PROCEDURE update_unique_authed_user_score_on_factoid();
