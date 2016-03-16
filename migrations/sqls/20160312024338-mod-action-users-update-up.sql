-- Rename the old enum
ALTER TYPE moderation_action_type RENAME TO moderation_action_type__;
-- Create new enum
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
  'adminUsers.ban',
  'adminUsers.unban',
  'adminUsers.banFromBoards',
  'adminUsers.unbanFromBoards',
  'adminUsers.addRoles',
  'adminUsers.removeRoles',
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
  'messages.delete'
);

-- Update table refrencing enum
ALTER TABLE moderation_log ALTER COLUMN action_type TYPE moderation_action_type USING action_type::text::moderation_action_type;

-- Drop the old enum
DROP type moderation_action_type__;

-- Update all adminUsers.update to users.update
UPDATE moderation_log SET action_type = 'users.update' WHERE action_type = 'adminUsers.update';

-- Rename the old enum
ALTER TYPE moderation_action_type RENAME TO moderation_action_type__;
-- Create new enum
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
  'adminUsers.ban',
  'adminUsers.unban',
  'adminUsers.banFromBoards',
  'adminUsers.unbanFromBoards',
  'adminUsers.addRoles',
  'adminUsers.removeRoles',
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
  'messages.delete'
);

-- Update table refrencing enum
ALTER TABLE moderation_log ALTER COLUMN action_type TYPE moderation_action_type USING action_type::text::moderation_action_type;

-- Drop the old enum
DROP type moderation_action_type__;
