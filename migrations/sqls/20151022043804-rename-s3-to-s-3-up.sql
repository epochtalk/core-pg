ALTER TABLE configurations RENAME COLUMN "images.s3.root" to "images.s_3.root";
ALTER TABLE configurations RENAME COLUMN "images.s3.dir" to "images.s_3.dir";
ALTER TABLE configurations RENAME COLUMN "images.s3.bucket" to "images.s_3.bucket";
ALTER TABLE configurations RENAME COLUMN "images.s3.region" to "images.s_3.region";
ALTER TABLE configurations RENAME COLUMN "images.s3.access_key" to "images.s_3.access_key";
ALTER TABLE configurations RENAME COLUMN "images.s3.secret_key" to "images.s_3.secret_key";
