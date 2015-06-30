ALTER TABLE posts ADD COLUMN deleted boolean DEFAULT false;
ALTER TABLE threads ADD COLUMN deleted boolean DEFAULT false;
ALTER TABLE boards ADD COLUMN deleted boolean DEFAULT false;
ALTER TABLE users ADD COLUMN deleted boolean DEFAULT false;
