const User = require("../models/User");

// Loads the whole org chart once and traverses in memory — cheap for the
// user-count this app is built for, and avoids N recursive queries.
async function allUsers() {
  return User.find({}, "_id name role reportsTo phone email active").lean();
}

async function descendantIds(userId) {
  const users = await allUsers();
  const id = String(userId);
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    users.forEach((u) => {
      const uid = String(u._id);
      const parent = u.reportsTo ? String(u.reportsTo) : null;
      if (parent && ids.has(parent) && !ids.has(uid)) {
        ids.add(uid);
        changed = true;
      }
    });
  }
  return ids;
}

async function reportingChain(userId) {
  const users = await allUsers();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const chain = [];
  let u = byId.get(String(userId));
  while (u) {
    chain.unshift(u);
    u = u.reportsTo ? byId.get(String(u.reportsTo)) : null;
  }
  return chain;
}

// Admin and Backend both get organization-wide visibility - Admin because
// they own the whole org, Backend because it's a cross-cutting operational
// role with no fixed position in the reporting tree (see constants.js).
function hasOrgWideAccess(role) {
  return role === "Admin" || role === "Backend";
}

async function visibleUserIds(currentUser) {
  if (hasOrgWideAccess(currentUser.role)) {
    const users = await allUsers();
    return new Set(users.map((u) => String(u._id)));
  }
  return descendantIds(currentUser._id);
}

// Mongo filter fragment for {partnerId: ...} scoped to what this user may see.
async function visibleLeadsFilter(currentUser) {
  if (hasOrgWideAccess(currentUser.role)) return {};
  const ids = await descendantIds(currentUser._id);
  return { partnerId: { $in: Array.from(ids) } };
}

async function stakeholdersForLead(lead) {
  const ids = new Set([String(lead.partnerId), String(lead.addedBy)]);
  const chain = await reportingChain(lead.partnerId);
  chain.forEach((u) => ids.add(String(u._id)));
  return Array.from(ids);
}

function wouldCreateCycle(descendantSet, newParentId) {
  return descendantSet.has(String(newParentId));
}

module.exports = {
  descendantIds,
  reportingChain,
  visibleUserIds,
  visibleLeadsFilter,
  stakeholdersForLead,
  wouldCreateCycle,
  hasOrgWideAccess,
};
