var reports = {};
module.exports = reports;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));

//  Report Statuses
//  id | priority |   status
// ----+----------+------------
//   1 |        1 | Pending
//   2 |        2 | Reviewed
//   3 |        3 | Ignored
//   4 |        4 | Bad Report

// User Report Operations
reports.createUserReport = function(userReport) {
  userReport = helper.deslugify(userReport);
  var q = 'INSERT INTO administration.reports_users(status_id, reporter_user_id, reporter_reason, offender_user_id, created_at, updated_at) VALUES($1, $2, $3, $4, now(), now()) RETURNING id';
  var statusId = 1; // New reports are always pending
  var params = [statusId, userReport.reporter_user_id, userReport.reporter_reason, userReport.offender_user_id];
  return db.sqlQuery(q, params)
  .then(function(rows) { // return created report id
    if (rows.length) { return rows[0].id; }
    else { return Promise.reject(); }
  })
  .then(function(reportId) { // Lookup the created report and return it
    var q = 'SELECT ru.id, rs.status, ru.reporter_user_id, ru.reporter_reason, ru.reviewer_user_id, ru.offender_user_id, ru.created_at, ru.updated_at FROM administration.reports_users ru JOIN administration.reports_statuses rs ON(ru.status_id = rs.id) WHERE ru.id = $1';
    var params = [reportId];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // return created row
    if(rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(helper.slugify);
};

reports.updateUserReport = function(userReport) {
  userReport = helper.deslugify(userReport);
  var q = 'SELECT ru.id, rs.status, ru.status_id, ru.reporter_user_id, ru.reporter_reason, ru.reviewer_user_id, ru.offender_user_id, ru.created_at, ru.updated_at FROM administration.reports_users ru JOIN administration.reports_statuses rs ON(ru.status_id = rs.id) WHERE ru.id = $1';
  var params = [userReport.id];
  var existingReport;
  return db.sqlQuery(q, params)
  .then(function(rows) { // check that report exists and return existing report with string status
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(function(dbUserReport) { // lookup status id by passed in status string (e.g "Reviewed" returns 2)
    existingReport = dbUserReport;
    var q = 'SELECT id FROM administration.reports_statuses WHERE status = $1';
    var params = [userReport.status];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // extract statusId from row and return
    if (rows.length) { return rows[0].id; }
    else { return Promise.reject(); }
  })
  .then(function(statusId) { // update report with new status_id, reviewer_user_id, and updated_at
    var newStatusId = statusId || existingReport.status_id;
    var newReviewerUserId = userReport.reviewer_user_id || existingReport.reviewer_user_id;
    var q = 'UPDATE administration.reports_users SET status_id = $1, reviewer_user_id = $2, updated_at = now() WHERE id = $3 RETURNING updated_at';
    var params = [newStatusId, newReviewerUserId, userReport.id];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // extract updated_at from row and return
    if (rows.length) { return rows[0].updated_at; }
    else { return Promise.reject(); }
  })
  .then(function(updatedAt) { // return updated report
    existingReport.updated_at = updatedAt;
    existingReport.status = userReport.status || existingReport.status;
    existingReport.reviewer_user_id = userReport.reviewer_user_id || existingReport.reviewer_user_id;
    delete existingReport.status_id; // only return status string
    return existingReport;
  })
  .then(helper.slugify);
};

reports.createUserReportNote = function(reportNote) {
  reportNote = helper.deslugify(reportNote);
  var q = 'INSERT INTO administration.reports_users_notes(report_id, user_id, note, created_at, updated_at) VALUES($1, $2, $3, now(), now()) RETURNING id, created_at, updated_at';
  var params = [reportNote.report_id, reportNote.user_id, reportNote.note];
  return db.sqlQuery(q, params)
  .then(function(rows) { // return created report note details
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(function(reportDetails) { // append id, created_at, updated_at and return created note
    reportNote.id = reportDetails.id;
    reportNote.created_at = reportDetails.created_at;
    reportNote.updated_at = reportDetails.updated_at;
    return reportNote;
  })
  .then(function() {
    var q = 'SELECT u.username, p.avatar FROM users u JOIN users.profiles p ON (p.user_id = u.id) WHERE u.id = $1';
    var params = [reportNote.user_id];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // return userInfo
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(function(userInfo) {
    reportNote.username = userInfo.username;
    reportNote.avatar = userInfo.avatar;
    return reportNote;
  })
  .then(helper.slugify);
};

reports.updateUserReportNote = function(reportNote) {
  reportNote = helper.deslugify(reportNote);
  var q = 'SELECT n.id, n.report_id, n.user_id, n.note, n.created_at, n.updated_at, u.username, p.avatar FROM administration.reports_users_notes n JOIN users u ON(u.id = user_id) JOIN users.profiles p ON (p.user_id = n.user_id) WHERE n.id = $1';
  var params = [reportNote.id];
  var existingReportNote;
  return db.sqlQuery(q, params)
  .then(function(rows) { // lookup and return existing reportNote
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(function(dbReportNote) { // update only note content and updated_at timestamp
    existingReportNote = dbReportNote;
    existingReportNote.note = reportNote.note;
    var q = 'UPDATE administration.reports_users_notes SET note = $1, updated_at = now() WHERE id = $2 RETURNING updated_at';
    var params = [existingReportNote.note, existingReportNote.id];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // extract updated_at from row and return
    if (rows.length) { return rows[0].updated_at; }
    else { return Promise.reject(); }
  })
  .then(function(updatedAt) { // return updated report note
    existingReportNote.updated_at = updatedAt;
    return existingReportNote;
  })
  .then(helper.slugify);
};

reports.pageUserReports = function(opts) {
  var q = 'SELECT ru.id, rs.status, ru.reporter_user_id, ru.reporter_reason, ru.reviewer_user_id, ru.offender_user_id, ru.created_at, ru.updated_at, (SELECT username FROM users WHERE ru.reporter_user_id = id) as reporter_username, o.username as offender_username, o.email as offender_email, o.created_at as offender_created_at, b.expiration as offender_ban_expiration FROM administration.reports_users ru JOIN administration.reports_statuses rs ON(ru.status_id = rs.id) JOIN users o ON(ru.offender_user_id = o.id) LEFT JOIN (SELECT ub.expiration, ub.user_id FROM users.bans ub WHERE ub.expiration > now()) b ON (o.id = b.user_id)';
  var limit = 10;
  var page = 1;
  var sortField = 'created_at';
  var order = 'ASC';
  var params;
  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.sortField) { sortField = opts.sortField; }
  if (opts && opts.sortDesc) { order = 'DESC'; }
  var offset = (page * limit) - limit;
  if (opts && opts.filter && opts.searchStr) { // filter + search
    q = [q, 'WHERE rs.status = $1 AND o.username LIKE $2 ORDER BY', sortField, order, 'LIMIT $3 OFFSET $4'].join(' ');
    params = [opts.filter, opts.searchStr + '%', limit, offset];
  }
  else if (opts && opts.filter && !opts.searchStr) { // filter only
    q = [q, 'WHERE rs.status = $1 ORDER BY', sortField, order, 'LIMIT $2 OFFSET $3'].join(' ');
    params = [opts.filter, limit, offset];
  }
  else if (opts && !opts.filter && opts.searchStr) { // search only
    q = [q, 'WHERE o.username LIKE $1 ORDER BY', sortField, order, 'LIMIT $2 OFFSET $3'].join(' ');
    params = [opts.searchStr + '%', limit, offset];
  }
  else { // no filter or search
    q = [q, 'ORDER BY', sortField, order, 'LIMIT $1 OFFSET $2'].join(' ');
    params = [limit, offset];
  }

  return db.sqlQuery(q, params)
  .then(helper.slugify);
};

reports.userReportsCount = function(opts) {
  var q = 'SELECT count(ru.id) FROM administration.reports_users ru'; // no status or search
  var params;
  if (opts && opts.status && opts.searchStr) { // status + search
    q += ' JOIN administration.reports_statuses rs ON(rs.id = ru.status_id) JOIN users u ON(ru.offender_user_id = u.id) WHERE rs.status = $1 AND u.username LIKE $2';
    params = [opts.status, opts.searchStr + '%'];
  }
  else if (opts && opts.status && !opts.searchStr) { // status only
    q += ' JOIN administration.reports_statuses rs ON(rs.id = ru.status_id) WHERE rs.status = $1';
    params = [opts.status];
  }
  else if (opts && !opts.status && opts.searchStr) { // search only
    q += ' JOIN users u ON(ru.offender_user_id = u.id) WHERE u.username LIKE $1';
    params = [opts.searchStr + '%'];
  }

  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  });
};

reports.pageUserReportsNotes = function(reportId, opts) {
  reportId = helper.deslugify(reportId);
  var q = 'SELECT n.id, n.report_id, n.user_id, n.note, n.created_at, n.updated_at, u.username, p.avatar FROM administration.reports_users_notes n JOIN users u ON(u.id = user_id) JOIN users.profiles p ON (p.user_id = n.user_id) WHERE n.report_id = $1 ORDER BY n.created_at';
  var limit = 10;
  var page = 1;
  var order = 'ASC';
  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.sortDesc) { order = 'DESC'; }
  q = [q, order, 'LIMIT $2 OFFSET $3'].join(' ');
  var offset = (page * limit) - limit;
  var params = [reportId, limit, offset];
  return db.sqlQuery(q, params)
  .then(helper.slugify);
};

reports.userReportsNotesCount = function(reportId) {
  reportId = helper.deslugify(reportId);
  var q = 'SELECT count(id) FROM administration.reports_users_notes WHERE report_id = $1';
  var params = [reportId];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  });
};


// Post Report Operations
reports.createPostReport = function(postReport) {
  postReport = helper.deslugify(postReport);
  var q = 'INSERT INTO administration.reports_posts(status_id, reporter_user_id, reporter_reason, offender_post_id, created_at, updated_at) VALUES($1, $2, $3, $4, now(), now()) RETURNING id';
  var statusId = 1; // New reports are always pending
  var params = [statusId, postReport.reporter_user_id, postReport.reporter_reason, postReport.offender_post_id];
  return db.sqlQuery(q, params)
  .then(function(rows) { // return created report id
    if (rows.length) { return rows[0].id; }
    else { return Promise.reject(); }
  })
  .then(function(reportId) { // Lookup the created report and return it
    var q = 'SELECT rp.id, rs.status, rp.reporter_user_id, rp.reporter_reason, rp.reviewer_user_id, rp.offender_post_id, rp.created_at, rp.updated_at FROM administration.reports_posts rp JOIN administration.reports_statuses rs ON(rp.status_id = rs.id) WHERE rp.id = $1';
    var params = [reportId];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // return created row
    if(rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(helper.slugify);
};

reports.updatePostReport = function(postReport) {
  postReport = helper.deslugify(postReport);
  var q = 'SELECT rp.id, rs.status, rp.status_id, rp.reporter_user_id, rp.reporter_reason, rp.reviewer_user_id, rp.offender_post_id, rp.created_at, rp.updated_at FROM administration.reports_posts rp JOIN administration.reports_statuses rs ON(rp.status_id = rs.id) WHERE rp.id = $1';
  var params = [postReport.id];
  var existingReport;
  return db.sqlQuery(q, params)
  .then(function(rows) { // check that report exists and return existing report with string status
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(function(dbPostReport) { // lookup status id by passed in status string (e.g "Reviewed" returns 2)
    existingReport = dbPostReport;
    var q = 'SELECT id FROM administration.reports_statuses WHERE status = $1';
    var params = [postReport.status];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // extract statusId from row and return
    if (rows.length) { return rows[0].id; }
    else { return Promise.reject(); }
  })
  .then(function(statusId) { // update report with new status_id, reviewer_user_id, and updated_at
    var newStatusId = statusId || existingReport.status_id;
    var newReviewerUserId = postReport.reviewer_user_id || existingReport.reviewer_user_id;
    var q = 'UPDATE administration.reports_posts SET status_id = $1, reviewer_user_id = $2, updated_at = now() WHERE id = $3 RETURNING updated_at';
    var params = [newStatusId, newReviewerUserId, postReport.id];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // extract updated_at from row and return
    if (rows.length) { return rows[0].updated_at; }
    else { return Promise.reject(); }
  })
  .then(function(updatedAt) { // return updated report
    existingReport.updated_at = updatedAt;
    existingReport.status = postReport.status || existingReport.status;
    existingReport.reviewer_user_id = postReport.reviewer_user_id || existingReport.reviewer_user_id;
    delete existingReport.status_id; // only return status string
    return existingReport;
  })
  .then(helper.slugify);
};

reports.createPostReportNote = function(reportNote) {
  reportNote = helper.deslugify(reportNote);
  var q = 'INSERT INTO administration.reports_posts_notes(report_id, user_id, note, created_at, updated_at) VALUES($1, $2, $3, now(), now()) RETURNING id, created_at, updated_at';
  var params = [reportNote.report_id, reportNote.user_id, reportNote.note];
  return db.sqlQuery(q, params)
  .then(function(rows) { // return created report note details
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(function(reportDetails) { // append id and return created note
    reportNote.id = reportDetails.id;
    reportNote.created_at = reportDetails.created_at;
    reportNote.updated_at = reportDetails.updated_at;
    return reportNote;
  })
  .then(function() {
    var q = 'SELECT u.username, p.avatar FROM users u JOIN users.profiles p ON (p.user_id = u.id) WHERE u.id = $1';
    var params = [reportNote.user_id];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // return userInfo
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(function(userInfo) {
    reportNote.username = userInfo.username;
    reportNote.avatar = userInfo.avatar;
    return reportNote;
  })
  .then(helper.slugify);
};

reports.updatePostReportNote = function(reportNote) {
  reportNote = helper.deslugify(reportNote);
  var q = 'SELECT n.id, n.report_id, n.user_id, n.note, n.created_at, n.updated_at, u.username, p.avatar FROM administration.reports_posts_notes n JOIN users u ON(u.id = user_id) JOIN users.profiles p ON (p.user_id = n.user_id) WHERE n.id = $1';
  var params = [reportNote.id];
  var existingReportNote;
  return db.sqlQuery(q, params)
  .then(function(rows) { // lookup and return existing reportNote
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(function(dbReportNote) { // update only note content and updated_at timestamp
    existingReportNote = dbReportNote;
    existingReportNote.note = reportNote.note;
    var q = 'UPDATE administration.reports_posts_notes SET note = $1, updated_at = now() WHERE id = $2 RETURNING updated_at';
    var params = [existingReportNote.note, existingReportNote.id];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // extract updated_at from row and return
    if (rows.length) { return rows[0].updated_at; }
    else { return Promise.reject(); }
  })
  .then(function(updatedAt) { // return updated report note
    existingReportNote.updated_at = updatedAt;
    return existingReportNote;
  })
  .then(helper.slugify);
};

reports.pagePostReports = function(opts) {
  var q = 'SELECT rp.id, rs.status, rp.reporter_user_id, rp.reporter_reason, rp.reviewer_user_id, rp.offender_post_id, rp.created_at, rp.updated_at, (SELECT username FROM users WHERE rp.reporter_user_id = id) as reporter_username, p.created_at as offender_created_at, p.title as offender_title, p.thread_id as offender_thread_id, o.username as offender_author_username, o.id as offender_author_id, o.email as offender_author_email, o.created_at as offender_author_created_at, b.expiration as offender_ban_expiration FROM administration.reports_posts rp JOIN administration.reports_statuses rs ON(rp.status_id = rs.id) JOIN posts p ON(rp.offender_post_id = p.id) JOIN users o ON(p.user_id = o.id) LEFT JOIN (SELECT ub.expiration, ub.user_id FROM users.bans ub WHERE ub.expiration > now()) b ON (o.id = b.user_id)';
  var limit = 10;
  var page = 1;
  var sortField = 'created_at';
  var order = 'ASC';
  var params;
  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.sortField) { sortField = opts.sortField; }
  if (opts && opts.sortDesc) { order = 'DESC'; }
  var offset = (page * limit) - limit;
  if (opts && opts.filter && opts.searchStr) { // filter + search
    q = [q, 'WHERE rs.status = $1 AND o.username LIKE $2 ORDER BY', sortField, order, 'LIMIT $3 OFFSET $4'].join(' ');
    params = [opts.filter, opts.searchStr + '%', limit, offset];
  }
  else if (opts && opts.filter && !opts.searchStr) { // filter only
    q = [q, 'WHERE rs.status = $1 ORDER BY', sortField, order, 'LIMIT $2 OFFSET $3'].join(' ');
    params = [opts.filter, limit, offset];
  }
  else if (opts && !opts.filter && opts.searchStr) { // search only
    q = [q, 'WHERE o.username LIKE $1 ORDER BY', sortField, order, 'LIMIT $2 OFFSET $3'].join(' ');
    params = [opts.searchStr + '%', limit, offset];
  }
  else { // no filter or search
    q = [q, 'ORDER BY', sortField, order, 'LIMIT $1 OFFSET $2'].join(' ');
    params = [limit, offset];
  }
  return db.sqlQuery(q, params)
  .then(helper.slugify);
};

reports.postReportsCount = function(opts) {
  var q = 'SELECT count(rp.id) FROM administration.reports_posts rp';
  var params;
  if (opts && opts.status && opts.searchStr) { // filter + search
    q += ' JOIN administration.reports_statuses rs ON(rs.id = rp.status_id) JOIN posts p ON(rp.offender_post_id = p.id) JOIN users o ON(p.user_id = o.id) WHERE rs.status = $1 AND o.username LIKE $2';
    params = [opts.status, opts.searchStr + '%'];
  }
  else if (opts && opts.status && !opts.searchStr) { // filter only
    q += ' JOIN administration.reports_statuses rs ON(rs.id = rp.status_id) WHERE rs.status = $1';
    params = [opts.status];
  }
  else if (opts && !opts.status && opts.searchStr) { // search only
    q += ' JOIN posts p ON(rp.offender_post_id = p.id) JOIN users o ON(p.user_id = o.id) WHERE o.username LIKE $1';
    params = [opts.searchStr + '%'];
  }
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  });
};

reports.pagePostReportsNotes = function(reportId, opts) {
  reportId = helper.deslugify(reportId);
  var q = 'SELECT n.id, n.report_id, n.user_id, n.note, n.created_at, n.updated_at, u.username, p.avatar FROM administration.reports_posts_notes n JOIN users u ON(u.id = user_id) JOIN users.profiles p ON (p.user_id = n.user_id) WHERE n.report_id = $1 ORDER BY n.created_at';
  var limit = 10;
  var page = 1;
  var order = 'ASC';
  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.sortDesc) { order = 'DESC'; }
  q = [q, order, 'LIMIT $2 OFFSET $3'].join(' ');
  var offset = (page * limit) - limit;
  var params = [reportId, limit, offset];
  return db.sqlQuery(q, params)
  .then(helper.slugify);
};

reports.postReportsNotesCount = function(reportId) {
  reportId = helper.deslugify(reportId);
  var q = 'SELECT count(id) FROM administration.reports_posts_notes WHERE report_id = $1';
  var params = [reportId];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  });
};
