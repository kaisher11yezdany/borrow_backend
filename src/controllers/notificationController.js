const Notification = require("../models/Notification");

async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = req.user.role === "Admin" ? {} : { stakeholderIds: req.user._id };
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);
  res.json({ notifications, total, page, totalPages });
}

module.exports = { list };
