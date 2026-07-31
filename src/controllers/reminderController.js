const Reminder = require("../models/Reminder");
const Lead = require("../models/Lead");
const { visibleLeadsFilter } = require("../utils/hierarchy");
const { canUpdateStage } = require("../utils/permissions");

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  return new Date(startOfToday().getTime() + 86399999);
}

// Grouped board for the Reminders tab: overdue / due today / upcoming,
// each entry paired with its lead for display. Readable by anyone who can see
// the lead (the Leads table shows a read-only follow-up badge to every role);
// only the mutation endpoints below are restricted to canUpdateStage.
async function listBoard(req, res) {
  const filter = await visibleLeadsFilter(req.user);
  const leads = await Lead.find(filter).lean();
  const leadIds = leads.map((l) => l._id);
  const leadById = new Map(leads.map((l) => [String(l._id), l]));

  const reminders = await Reminder.find({ leadId: { $in: leadIds }, status: "pending" }).sort({ date: 1 }).lean();
  const items = reminders
    .filter((r) => leadById.has(String(r.leadId)))
    .map((r) => ({ reminder: r, lead: leadById.get(String(r.leadId)) }));

  const today = startOfToday();
  const eod = endOfToday();
  const overdue = items.filter((x) => new Date(x.reminder.date) < today);
  const dueToday = items.filter((x) => new Date(x.reminder.date) >= today && new Date(x.reminder.date) <= eod);
  const upcoming = items.filter((x) => new Date(x.reminder.date) > eod);

  res.json({ overdue, dueToday, upcoming });
}

async function listForLead(req, res) {
  const reminders = await Reminder.find({ leadId: req.params.leadId }).sort({ createdAt: -1 });
  res.json({ reminders });
}

async function addReminder(req, res) {
  if (!canUpdateStage(req.user)) return res.status(403).json({ error: "Not available at your role" });
  const lead = await Lead.findById(req.params.leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const b = req.body;
  if (!b.date || !b.caseDetails) return res.status(400).json({ error: "date and caseDetails are required" });
  const reminder = await Reminder.create({
    leadId: lead._id,
    date: new Date(b.date),
    caseDetails: b.caseDetails.trim(),
    createdBy: req.user._id,
  });
  res.status(201).json({ reminder });
}

async function markDone(req, res) {
  if (!canUpdateStage(req.user)) return res.status(403).json({ error: "Not available at your role" });
  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) return res.status(404).json({ error: "Reminder not found" });
  reminder.status = "done";
  reminder.completedAt = new Date();
  await reminder.save();
  res.json({ reminder });
}

async function markPending(req, res) {
  if (!canUpdateStage(req.user)) return res.status(403).json({ error: "Not available at your role" });
  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) return res.status(404).json({ error: "Reminder not found" });
  reminder.status = "pending";
  reminder.completedAt = null;
  await reminder.save();
  res.json({ reminder });
}

async function remove(req, res) {
  if (!canUpdateStage(req.user)) return res.status(403).json({ error: "Not available at your role" });
  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) return res.status(404).json({ error: "Reminder not found" });
  await reminder.deleteOne();
  res.json({ ok: true });
}

module.exports = { listBoard, listForLead, addReminder, markDone, markPending, remove };
