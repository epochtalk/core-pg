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

-- Update all adminUsers.update to users.update
UPDATE moderation_log SET action_type = 'reports.createMessageReportNote' WHERE action_type = 'adminReports.createMessageReportNote';
UPDATE moderation_log SET action_type = 'reports.updateMessageReportNote' WHERE action_type = 'adminReports.updateMessageReportNote';
UPDATE moderation_log SET action_type = 'reports.createPostReportNote' WHERE action_type = 'adminReports.createPostReportNote';
UPDATE moderation_log SET action_type = 'reports.updatePostReportNote' WHERE action_type = 'adminReports.updatePostReportNote';
UPDATE moderation_log SET action_type = 'reports.createUserReportNote' WHERE action_type = 'adminReports.createUserReportNote';
UPDATE moderation_log SET action_type = 'reports.updateUserReportNote' WHERE action_type = 'adminReports.updateUserReportNote';
UPDATE moderation_log SET action_type = 'reports.updateMessageReport' WHERE action_type = 'adminReports.updateMessageReport';
UPDATE moderation_log SET action_type = 'reports.updatePostReport' WHERE action_type = 'adminReports.updatePostReport';
UPDATE moderation_log SET action_type = 'reports.updateUserReport' WHERE action_type = 'adminReports.updateUserReport';

-- Rename the old enum
ALTER TYPE moderation_action_type RENAME TO moderation_action_type__;
-- Create new enum
CREATE TYPE moderation_action_type AS ENUM (
  'adminBoards.updateCategories',
  'adminModerators.add',
  'adminModerators.remove',
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
