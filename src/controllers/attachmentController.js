const Lead = require("../models/Lead");
const Attachment = require("../models/Attachment");
const { saveUploadedFile, deleteStoredFile } = require("../utils/fileStorage");

function canModify(attachment, user) {
  return user.role === "Admin" || String(attachment.uploadedBy) === String(user._id);
}

async function listForLead(req, res) {
  const attachments = await Attachment.find({ leadId: req.params.leadId })
    .populate("uploadedBy", "name")
    .sort({ createdAt: -1 });
  res.json({ attachments });
}

// Accepts one or more files under the "files" field (multipart), so the
// frontend can select several at once and upload them together.
async function addAttachments(req, res) {
  const lead = await Lead.findById(req.params.leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: "No files uploaded" });

  const attachments = [];
  for (const file of files) {
    let saved;
    try {
      saved = await saveUploadedFile(file);
    } catch (err) {
      return res.status(400).json({
        error: `Couldn't process "${file.originalname}" — it may be corrupted or an unsupported format.`,
        uploaded: attachments,
      });
    }
    const attachment = await Attachment.create({
      leadId: lead._id,
      originalName: file.originalname,
      url: saved.url,
      mimeType: saved.mimeType,
      size: saved.size,
      uploadedBy: req.user._id,
    });
    await attachment.populate("uploadedBy", "name");
    attachments.push(attachment);
  }
  res.status(201).json({ attachments });
}

// Rename (label) and/or replace the underlying file for an existing attachment.
async function updateAttachment(req, res) {
  const attachment = await Attachment.findById(req.params.id);
  if (!attachment) return res.status(404).json({ error: "Attachment not found" });
  if (!canModify(attachment, req.user)) return res.status(403).json({ error: "You can only edit your own attachments" });

  if (req.body.label !== undefined) attachment.label = req.body.label.trim();

  const file = (req.files || [])[0];
  if (file) {
    let saved;
    try {
      saved = await saveUploadedFile(file);
    } catch (err) {
      return res.status(400).json({ error: `Couldn't process "${file.originalname}" — it may be corrupted or an unsupported format.` });
    }
    const oldUrl = attachment.url;
    attachment.originalName = file.originalname;
    attachment.url = saved.url;
    attachment.mimeType = saved.mimeType;
    attachment.size = saved.size;
    await deleteStoredFile(oldUrl);
  }

  await attachment.save();
  await attachment.populate("uploadedBy", "name");
  res.json({ attachment });
}

async function removeAttachment(req, res) {
  const attachment = await Attachment.findById(req.params.id);
  if (!attachment) return res.status(404).json({ error: "Attachment not found" });
  if (!canModify(attachment, req.user)) return res.status(403).json({ error: "You can only delete your own attachments" });
  await deleteStoredFile(attachment.url);
  await attachment.deleteOne();
  res.json({ ok: true });
}

module.exports = { listForLead, addAttachments, updateAttachment, removeAttachment };
