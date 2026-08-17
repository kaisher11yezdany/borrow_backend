const Note = require("../models/Note");
const Lead = require("../models/Lead");
const { stakeholdersForLead } = require("../utils/hierarchy");
const { pushNotification } = require("../utils/notify");

function canModify(note, user) {
  return user.role === "Admin" || String(note.createdBy) === String(user._id);
}

async function listForLead(req, res) {
  const leadFilter = { leadId: req.params.leadId };
  if (req.query.type === "note") {
    leadFilter.$or = [{ type: "note" }, { type: { $exists: false } }];
  } else if (req.query.type) {
    leadFilter.type = req.query.type;
  }
  const notes = await Note.find(leadFilter).populate("createdBy", "name").sort({ createdAt: -1 });
  res.json({ notes });
}

async function addNote(req, res) {
  const lead = await Lead.findById(req.params.leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const text = (req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Note text is required" });
  const type = req.body.type || "note";
  const note = await Note.create({ leadId: lead._id, text, type, createdBy: req.user._id });
  await note.populate("createdBy", "name");

  const stakeholders = await stakeholdersForLead(lead);

  req.app.io.emit("note:added", {
    leadId: lead._id,
    leadName: lead.customerName,
    note: text.substring(0, 100),
    type,
    addedBy: req.user.name,
    timestamp: new Date(),
  });

  await pushNotification(
    lead,
    `${req.user.name} ${type === "comment" ? "commented" : "added a note"}: "${text.substring(0, 50)}..."`
  );

  res.status(201).json({ note });
}

async function updateNote(req, res) {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });
  if (!canModify(note, req.user)) return res.status(403).json({ error: "You can only edit your own notes" });
  const text = (req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Note text is required" });
  note.text = text;
  note.edited = true;
  await note.save();
  await note.populate("createdBy", "name");
  res.json({ note });
}

async function removeNote(req, res) {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });
  if (!canModify(note, req.user)) return res.status(403).json({ error: "You can only delete your own notes" });
  await note.deleteOne();
  res.json({ ok: true });
}

module.exports = { listForLead, addNote, updateNote, removeNote };
