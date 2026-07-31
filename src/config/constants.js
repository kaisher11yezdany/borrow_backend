const ROLES = ["Admin", "Manager", "Team Lead", "Sales Manager", "Referral Partner"];
const STAGES = ["Lead Added", "Lead Contacted", "Login Done", "Sanction Done", "Disbursement Done"];
const ACCT_FIELDS = ["receivable", "payable", "managerComp", "serviceFee"];

function rank(role) {
  return ROLES.indexOf(role);
}
function parentRoleFor(role) {
  const r = rank(role);
  if (r <= 0) return null;
  return ROLES[r - 1];
}

module.exports = { ROLES, STAGES, ACCT_FIELDS, rank, parentRoleFor };
