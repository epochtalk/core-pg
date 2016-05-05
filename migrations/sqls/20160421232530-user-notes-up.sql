/* Post Reports Notes */
CREATE TABLE user_notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  author_id uuid NOT NULL,
  note text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE INDEX index_user_notes_on_user_id ON user_notes USING btree (user_id);
CREATE INDEX index_user_notes_on_created_at ON user_notes USING btree (created_at);

ALTER TABLE user_notes ADD CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE user_notes ADD CONSTRAINT author_user_id_fk FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE;

-- Rename the old enum
ALTER TYPE moderation_action_type RENAME TO moderation_action_type__;
-- Create new enums for userNotes
CREATE TYPE moderation_action_type AS ENUM (
  'adminBoards.updateCategories',
  'adminModerators.add',
  'adminModerators.remove',
  'adminReports.createMessageReportNote',
  'adminReports.updateMessageReportNote',
  'adminReports.createPostReportNote',
  'adminReports.updatePostReportNote',
  'adminReports.createUserReportNote',
  'adminReports.updateUserReportNote',
  'adminReports.updateMessageReport',
  'adminReports.updatePostReport',
  'adminReports.updateUserReport',
  'adminRoles.add',
  'adminRoles.remove',
  'adminRoles.update',
  'adminRoles.reprioritize',
  'adminSettings.update',
  'adminSettings.addToBlacklist',
  'adminSettings.updateBlacklist',
  'adminSettings.deleteFromBlacklist',
  'adminSettings.setTheme',
  'adminSettings.resetTheme',
  'adminUsers.update',
  'adminUsers.addRoles',
  'adminUsers.removeRoles',
  'userNotes.create',
  'userNotes.update',
  'userNotes.delete',
  'bans.ban',
  'bans.unban',
  'bans.banFromBoards',
  'bans.unbanFromBoards',
  'bans.addAddresses',
  'bans.editAddress',
  'bans.deleteAddress',
  'boards.create',
  'boards.update',
  'boards.delete',
  'threads.title',
  'threads.sticky',
  'threads.createPoll',
  'threads.lock',
  'threads.move',
  'threads.lockPoll',
  'threads.purge',
  'threads.editPoll',
  'posts.update',
  'posts.undelete',
  'posts.delete',
  'posts.purge',
  'users.update',
  'users.delete',
  'users.reactivate',
  'users.deactivate',
  'conversations.delete',
  'messages.delete',
  'reports.createMessageReportNote',
  'reports.updateMessageReportNote',
  'reports.createPostReportNote',
  'reports.updatePostReportNote',
  'reports.createUserReportNote',
  'reports.updateUserReportNote',
  'reports.updateMessageReport',
  'reports.updatePostReport',
  'reports.updateUserReport'
);
-- Update table refrencing enum
ALTER TABLE moderation_log ALTER COLUMN action_type TYPE moderation_action_type USING action_type::text::moderation_action_type;

-- Drop the old enum
DROP type moderation_action_type__;
