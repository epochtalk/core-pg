CREATE TABLE users.board_bans (
  user_id uuid NOT NULL,
  board_id uuid NOT NULL
);

CREATE INDEX index_board_bans_on_user_id ON users.board_bans USING btree (user_id);
CREATE INDEX index_board_bans_on_board_id ON users.board_bans USING btree (board_id);
CREATE UNIQUE INDEX index_board_bans_on_user_id_and_board_id ON users.board_bans USING btree(user_id, board_id);
ALTER TABLE users.board_bans ADD CONSTRAINT board_bans_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE users.board_bans ADD CONSTRAINT board_bans_board_id_fk FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE;

-- Rename the old enum
ALTER TYPE moderation_action_type RENAME TO moderation_action_type__;
-- Create new enum
CREATE TYPE moderation_action_type AS ENUM ('adminBoards.updateCategories','adminModerators.add','adminModerators.remove','adminReports.createMessageReportNote','adminReports.updateMessageReportNote','adminReports.createPostReportNote','adminReports.updatePostReportNote','adminReports.createUserReportNote','adminReports.updateUserReportNote','adminReports.updateMessageReport','adminReports.updatePostReport','adminReports.updateUserReport','adminRoles.add','adminRoles.remove','adminRoles.update','adminRoles.reprioritize','adminSettings.update','adminSettings.addToBlacklist','adminSettings.updateBlacklist','adminSettings.deleteFromBlacklist','adminSettings.setTheme','adminSettings.resetTheme','adminUsers.update','adminUsers.ban','adminUsers.unban','adminUsers.banFromBoards','adminUsers.unbanFromBoards','adminUsers.addRoles','adminUsers.removeRoles','boards.create','boards.update','boards.delete','threads.title','threads.sticky','threads.createPoll','threads.lock','threads.move','threads.lockPoll','threads.purge','threads.editPoll','posts.update','posts.undelete','posts.delete','posts.purge','users.delete','users.reactivate','users.deactivate','conversations.delete','messages.delete');

-- Update table refrencing enum
ALTER TABLE moderation_log ALTER COLUMN action_type TYPE moderation_action_type USING action_type::text::moderation_action_type;

-- Drop the old enum
DROP type moderation_action_type__;
