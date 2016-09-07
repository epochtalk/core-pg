ALTER TABLE configurations DROP COLUMN IF EXISTS "portal_board_id";
ALTER TABLE configurations ADD COLUMN "portal.board_id" uuid REFERENCES boards;
