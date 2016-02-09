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
  'users.delete',
  'users.reactivate',
  'users.deactivate',
  'conversations.delete',
  'messages.delete'
);

CREATE TABLE moderation_log (
  mod_username character varying(50) NOT NULL,
  mod_id uuid,
  mod_ip character varying(255),
  action_api_url character varying(2000) NOT NULL,
  action_api_method character varying(25) NOT NULL,
  action_obj json NOT NULL,
  action_taken_at timestamp with time zone NOT NULL,
  action_type moderation_action_type NOT NULL,
  action_display_text text NOT NULL,
  action_display_url text
);

CREATE INDEX index_moderation_log_on_mod_username ON moderation_log USING btree (mod_username);
CREATE INDEX index_moderation_log_on_mod_id ON moderation_log USING btree (mod_id);
CREATE INDEX index_moderation_log_on_mod_ip ON moderation_log USING btree (mod_ip);
CREATE INDEX index_moderation_log_on_action_api_url ON moderation_log USING btree (action_api_url);
CREATE INDEX index_moderation_log_on_action_api_method ON moderation_log USING btree (action_api_method);
CREATE INDEX index_moderation_log_on_action_taken_at ON moderation_log USING btree (action_taken_at);
CREATE INDEX index_moderation_log_on_action_type ON moderation_log USING btree (action_type);
