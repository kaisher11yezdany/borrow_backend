// Order here is display/org-chart order only — NOT a seniority/permission
// inheritance order. Sales Manager sits above Team Lead but has fewer
// permissions than Team Lead (see utils/permissions.js's capability matrix),
// so nothing may derive access from array position. "Backend" is a
// cross-cutting operational role, not a position in the reporting tree.
const ROLES = ["Admin", "Backend", "Branch Manager", "Sales Manager", "Team Lead", "RM", "Referral Partner"];
const STAGES = ["Lead Added", "Lead Contacted", "Login Done", "Sanction Done", "Disbursement Done"];
const ACCT_FIELDS = ["receivable", "payable", "managerComp", "serviceFee"];

// The reporting chain, top to bottom. Admin and Backend are intentionally
// absent as keys - Admin is the root (no parent), Backend does not sit in
// the tree at all (org-wide visibility, no reportsTo).
const PARENT_ROLE = {
  "Branch Manager": "Admin",
  "Sales Manager": "Branch Manager",
  "Team Lead": "Sales Manager",
  RM: "Team Lead",
  "Referral Partner": "RM",
};

function parentRoleFor(role) {
  return PARENT_ROLE[role] || null;
}

module.exports = { ROLES, STAGES, ACCT_FIELDS, PARENT_ROLE, parentRoleFor };
