const Notification = require("../models/Notification");
const { hasOrgWideAccess } = require("../utils/hierarchy");

async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  // Backend has no fixed position in the reporting tree, so it would never
  // appear in any lead's stakeholderIds - without this it would see zero
  // notifications despite otherwise having org-wide access.
  const filter = hasOrgWideAccess(req.user.role) ? {} : { stakeholderIds: req.user._id };
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);
  res.json({ notifications, total, page, totalPages });
}

module.exports = { list };
