const Lead = require("../models/Lead");
const { visibleLeadsFilter } = require("../utils/hierarchy");
const { canVerify } = require("../utils/permissions");
const { setVerification } = require("../utils/leadHelpers");
const { pushNotification } = require("../utils/notify");

const FIELDS = ["verification", "finalVerification"];

// Returns paginated leads for each tab with total counts and page info.
// Supports server-side pagination via query parameters: page, limit, tab
async function getQueues(req, res) {
  if (!canVerify(req.user)) return res.status(403).json({ error: "Only Team Leads and above can verify leads" });

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
  const tab = req.query.tab || "new"; // "new" or "final"

  const filter = await visibleLeadsFilter(req.user);
  const skip = (page - 1) * limit;

  if (tab === "new") {
    // New leads queue (all stages)
    const [items, total] = await Promise.all([
      Lead.find({ ...filter, "closure.status": "open" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments({ ...filter, "closure.status": "open" }),
    ]);
    const pendingCount = items.filter((l) => ["pending", "duplicate_flag"].includes(l.verification.status)).length;
    const totalPages = Math.ceil(total / limit);
    res.json({ queue: items, total, page, totalPages, pendingCount });
  } else {
    // Final verification queue (Disbursement Done stage only)
    const [items, total] = await Promise.all([
      Lead.find({ ...filter, "closure.status": "open", stage: "Disbursement Done" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments({ ...filter, "closure.status": "open", stage: "Disbursement Done" }),
    ]);
    const pendingCount = items.filter((l) => l.finalVerification.status === "pending").length;
    const totalPages = Math.ceil(total / limit);
    res.json({ finalQueue: items, total, page, totalPages, pendingCount });
  }
}

async function approve(req, res) {
  if (!canVerify(req.user)) return res.status(403).json({ error: "Only Team Leads and above can verify leads" });
  const { field } = req.params;
  if (!FIELDS.includes(field)) return res.status(400).json({ error: "Invalid verification field" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  setVerification(lead, field, "verified", "", req.user._id);
  await lead.save();
  await pushNotification(
    lead,
    field === "finalVerification"
      ? `${req.user.name} approved the final check — lead is now Completed.`
      : `${req.user.name} verified this lead.`
  );
  res.json({ lead });
}

async function reject(req, res) {
  if (!canVerify(req.user)) return res.status(403).json({ error: "Only Team Leads and above can verify leads" });
  const { field } = req.params;
  if (!FIELDS.includes(field)) return res.status(400).json({ error: "Invalid verification field" });
  const reason = (req.body.reason || "").trim();
  if (!reason) return res.status(400).json({ error: "A reason is required" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  setVerification(lead, field, "rejected", reason, req.user._id);
  await lead.save();
  await pushNotification(
    lead,
    `${req.user.name} rejected this lead${field === "finalVerification" ? " at the final check" : ""}. Reason: ${reason}`
  );
  res.json({ lead });
}

module.exports = { getQueues, approve, reject };
