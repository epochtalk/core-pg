ALTER TABLE configurations RENAME COLUMN "emailer.port" TO "emailer.options.port";
ALTER TABLE configurations RENAME COLUMN "emailer.host" TO "emailer.options.host";
ALTER TABLE configurations RENAME COLUMN "emailer.secure" TO "emailer.options.secure";
