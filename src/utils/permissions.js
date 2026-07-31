const { rank } = require("../config/constants");

function canVerify(user) {
  return rank(user.role) <= rank("Team Lead");
}
function canUpdateStage(user) {
  return rank(user.role) <= rank("Sales Manager");
}
function canManageAccounting(user) {
  return rank(user.role) <= rank("Manager");
}
function canManageTeam(user) {
  return user.role === "Admin";
}
function canSeeMargin(user) {
  return rank(user.role) <= rank("Team Lead");
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
  canUpdateStage,
  canManageAccounting,
  canManageTeam,
  canSeeMargin,
  canEditLead,
  canEditAccounting,
  isClosed,
};
