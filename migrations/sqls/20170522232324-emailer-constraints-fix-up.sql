ALTER TABLE configurations ALTER COLUMN "emailer.sender" DROP NOT NULL;
ALTER TABLE configurations ALTER COLUMN "emailer.port" DROP NOT NULL;
ALTER TABLE configurations ALTER COLUMN "emailer.host" DROP NOT NULL;
ALTER TABLE configurations ALTER COLUMN "emailer.secure" DROP NOT NULL;
