const User = require("../models/User");
const Lead = require("../models/Lead");
const { descendantIds, reportingChain } = require("../utils/hierarchy");
const { canManageTeam } = require("../utils/permissions");

// Deliberately unscoped: any authenticated user may assign a lead's payout
// owner to anyone in the org, not just their own downline.
async function listAllUsers(req, res) {
  const users = await User.find({}, "name role").sort({ name: 1 });
  res.json({ users });
}

async function getTeam(req, res) {
  const chain = await reportingChain(req.user._id);
  let users;
  if (req.user.role === "Admin") {
    users = await User.find({}, "-passwordHash").sort({ name: 1 });
  } else {
    const ids = await descendantIds(req.user._id);
    users = await User.find({ _id: { $in: Array.from(ids) } }, "-passwordHash").sort({ name: 1 });
  }
  res.json({ users, chain: chain.map((u) => ({ id: u._id, name: u.name, role: u.role })) });
}

async function addUser(req, res) {
  if (!canManageTeam(req.user)) return res.status(403).json({ error: "Only Admin can add or re-map people" });
  const b = req.body;
  if (!b.name || !b.role || !b.reportsTo || !b.password) {
    return res.status(400).json({ error: "name, role, reportsTo and an initial password are required" });
  }
  if (b.role === "Admin") return res.status(400).json({ error: "Cannot create another Admin" });
  const user = new User({
    name: b.name.trim(),
    role: b.role,
    reportsTo: b.reportsTo,
    phone: (b.phone || "").trim(),
    email: (b.email || "").trim().toLowerCase() || undefined,
  });
  await user.setPassword(b.password);
  await user.save();
  res.status(201).json({ user: user.toSafeJSON() });
}

async function updateUser(req, res) {
  if (!canManageTeam(req.user)) return res.status(403).json({ error: "Only Admin can edit people" });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.role === "Admin") return res.status(400).json({ error: "The Admin account can't be edited here" });

  const b = req.body;
  if (b.reportsTo) {
    const descendants = await descendantIds(target._id);
    if (descendants.has(String(b.reportsTo))) {
      return res.status(400).json({ error: "That would create a reporting loop" });
    }
    target.reportsTo = b.reportsTo;
  }
  if (b.name) target.name = b.name.trim();
  if (b.phone !== undefined) target.phone = b.phone.trim();
  if (b.email !== undefined) target.email = b.email.trim().toLowerCase() || undefined;
  if (b.role) target.role = b.role;
  if (b.password) await target.setPassword(b.password);
  await target.save();
  res.json({ user: target.toSafeJSON() });
}

async function deleteUser(req, res) {
  if (!canManageTeam(req.user)) return res.status(403).json({ error: "Only Admin can delete people" });
  const target = await User.findById(req.params.id);
  const admin = await User.findOne({ role: "Admin" });
  if (!target || target.role === "Admin") return res.status(400).json({ error: "The Admin account can't be deleted" });

  await User.updateMany({ reportsTo: target._id }, { reportsTo: admin._id });
  await Lead.updateMany({ partnerId: target._id }, { partnerId: admin._id });
  await target.deleteOne();
  res.json({ ok: true, reassignedTo: admin._id });
}

module.exports = { getTeam, listAllUsers, addUser, updateUser, deleteUser };
