CREATE TABLE invitations (
  email citext CHECK (length(email) <= 255) NOT NULL,
  hash character varying(255) NOT NULL,
  created_at timestamp with time zone NOT NULL
);

CREATE UNIQUE INDEX index_invitations_on_email ON invitations USING btree (email);
CREATE INDEX index_invitations_on_hash ON invitations USING btree (hash);
CREATE INDEX index_invitations_on_created_at ON invitations USING btree (created_at);

-- hotfix to allow deleting users tied to ads
ALTER TABLE ads.authed_users
DROP CONSTRAINT authed_users_user_id_fkey,
ADD CONSTRAINT authed_users_user_id_fkey
   FOREIGN KEY (user_id)
   REFERENCES users(id)
   ON DELETE CASCADE;

-- adding settings for invite only
ALTER TABLE configurations ADD COLUMN "invite_only" boolean DEFAULT false NOT NULL;
