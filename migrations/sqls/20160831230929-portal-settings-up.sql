ALTER TABLE configurations ADD COLUMN "portal.enabled" boolean DEFAULT false;
ALTER TABLE configurations ADD COLUMN "portal_board_id" uuid REFERENCES boards; 
