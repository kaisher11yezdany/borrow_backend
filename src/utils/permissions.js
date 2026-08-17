// Explicit per-role capability matrix. Roles are NOT a strict seniority chain
// here - Sales Manager sits above Team Lead in the org chart but has fewer
// permissions than Team Lead, so nothing may be derived from role order
// (rank comparisons). Every capability below is its own allow-list.

const CAN_VERIFY = new Set(["Admin", "Backend", "Branch Manager", "Team Lead"]);
const CAN_VERIFY_ACTIONS = new Set(["Admin", "Branch Manager", "Team Lead"]);
const CAN_UPDATE_STAGE = new Set(["Admin", "Backend", "Branch Manager", "Sales Manager", "Team Lead", "RM"]);
const CAN_MANAGE_ACCOUNTING = new Set(["Admin", "Backend", "Branch Manager"]);
const CAN_SEE_MARGIN = new Set(["Admin", "Backend", "Branch Manager", "Team Lead"]);
const CAN_MANAGE_SETTINGS = new Set(["Admin", "Backend", "Branch Manager"]);
const CAN_VIEW_TEAM_HIERARCHY = new Set(["Admin", "Backend", "Branch Manager", "Team Lead", "RM"]);
const CAN_MANAGE_TEAM_MEMBERS = new Set(["Admin", "Backend", "Branch Manager"]);
const CAN_MANAGE_HIERARCHY = new Set(["Admin"]);
const CAN_EXPORT_DATA = new Set(["Admin"]);

function canVerify(user) {
  return CAN_VERIFY.has(user.role);
}
function canVerifyActions(user) {
  return CAN_VERIFY_ACTIONS.has(user.role);
}
function canUpdateStage(user) {
  return CAN_UPDATE_STAGE.has(user.role);
}
function canManageAccounting(user) {
  return CAN_MANAGE_ACCOUNTING.has(user.role);
}
function canSeeMargin(user) {
  return CAN_SEE_MARGIN.has(user.role);
}
function canManageSettings(user) {
  return CAN_MANAGE_SETTINGS.has(user.role);
}
function canViewTeamHierarchy(user) {
  return CAN_VIEW_TEAM_HIERARCHY.has(user.role);
}
function canManageTeamMembers(user) {
  return CAN_MANAGE_TEAM_MEMBERS.has(user.role);
}
function canManageHierarchy(user) {
  return CAN_MANAGE_HIERARCHY.has(user.role);
}
function canExportData(user) {
  return CAN_EXPORT_DATA.has(user.role);
}
function isClosed(lead) {
  return lead.closure && lead.closure.status !== "open";
}
function canEditLead(lead, user) {
  if (user.role === "Admin") return true;
  if (isClosed(lead)) return false;
  return lead.verification.status !== "verified";
}
function canEditAccounting(lead, user) {
  return canManageAccounting(user) && lead.finalVerification.status === "verified";
}

module.exports = {
  canVerify,
  canVerifyActions,
  canUpdateStage,
  canManageAccounting,
  canSeeMargin,
  canManageSettings,
  canViewTeamHierarchy,
  canManageTeamMembers,
  canManageHierarchy,
  canExportData,
  canEditLead,
  canEditAccounting,
  isClosed,
};
