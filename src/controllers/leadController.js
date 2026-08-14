const Lead = require("../models/Lead");
const AccountingEntry = require("../models/AccountingEntry");
const Expense = require("../models/Expense");
const Reminder = require("../models/Reminder");
const Note = require("../models/Note");
const Attachment = require("../models/Attachment");
const { STAGES } = require("../config/constants");
const { visibleLeadsFilter, descendantIds, hasOrgWideAccess } = require("../utils/hierarchy");
const { canEditLead, canUpdateStage, isClosed } = require("../utils/permissions");
const { phoneDuplicateStatus, setVerification, nextStage } = require("../utils/leadHelpers");
const { pushNotification } = require("../utils/notify");
const { deleteStoredFile } = require("../utils/fileStorage");

async function assertVisible(req, lead) {
  if (hasOrgWideAccess(req.user.role)) return true;
  const ids = await descendantIds(req.user._id);
  return ids.has(String(lead.partnerId));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Filtering and pagination both happen in Mongo, not in memory — this list
// is expected to grow, so we only ever pull one page off the wire.
async function listLeads(req, res) {
  const filter = await visibleLeadsFilter(req.user);
  const q = req.query;
  if (q.product && q.product !== "All") filter.product = q.product;
  if (q.partnerId) filter.partnerId = q.partnerId;
  if (q.stage) filter.stage = q.stage;
  if (q.status) filter["verification.status"] = q.status;
  if (q.showClosed !== "true") filter["closure.status"] = "open";
  if (q.search) {
    const re = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ customerName: re }, { phone: re }];
  }
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from);
    if (q.to) filter.createdAt.$lte = new Date(new Date(q.to).getTime() + 86399999);
  }

  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);
  res.json({ leads, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
}

async function getLead(req, res) {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (!(await assertVisible(req, lead))) return res.status(403).json({ error: "Not visible to you" });
  res.json({ lead });
}

async function createLead(req, res) {
  const b = req.body;
  if (!b.customerName || !b.phone || !b.product || !b.partnerId) {
    return res.status(400).json({ error: "customerName, phone, product and partnerId are required" });
  }
  const dupe = await phoneDuplicateStatus(Lead, b.phone.trim());
  const lead = await Lead.create({
    customerName: b.customerName.trim(),
    phone: b.phone.trim(),
    altPhone: b.altPhone?.trim() || "",
    email: b.email?.trim() || "",
    product: b.product,
    loanAmount: Number(b.loanAmount) || 0,
    monthlyIncome: Number(b.monthlyIncome) || 0,
    employmentType: b.employmentType || "Salaried",
    leadSource: b.leadSource || "Referral",
    leadChannel: b.leadChannel || "",
    city: b.city?.trim() || "",
    occupation: b.occupation?.trim() || "",
    notes: b.notes?.trim() || "",
    partnerId: b.partnerId,
    addedBy: req.user._id,
    verificationProofUrl: b.verificationProofUrl || null,
    verification: { status: dupe.status, note: dupe.note, history: [] },
  });
  await pushNotification(lead, `${req.user.name} added a new lead.`);
  res.status(201).json({ lead });
}

async function updateLead(req, res) {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (!canEditLead(lead, req.user)) return res.status(403).json({ error: "This lead can no longer be edited" });

  const b = req.body;
  const wasRejected = lead.verification.status === "rejected";
  Object.assign(lead, {
    customerName: b.customerName?.trim() ?? lead.customerName,
    phone: b.phone?.trim() ?? lead.phone,
    altPhone: b.altPhone?.trim() ?? lead.altPhone,
    email: b.email?.trim() ?? lead.email,
    loanAmount: b.loanAmount !== undefined ? Number(b.loanAmount) || 0 : lead.loanAmount,
    monthlyIncome: b.monthlyIncome !== undefined ? Number(b.monthlyIncome) || 0 : lead.monthlyIncome,
    employmentType: b.employmentType ?? lead.employmentType,
    leadSource: b.leadSource ?? lead.leadSource,
    leadChannel: b.leadChannel ?? lead.leadChannel,
    city: b.city?.trim() ?? lead.city,
    occupation: b.occupation?.trim() ?? lead.occupation,
    notes: b.notes?.trim() ?? lead.notes,
  });
  if (b.verificationProofUrl) lead.verificationProofUrl = b.verificationProofUrl;

  if (lead.verification.status !== "verified") {
    const dupe = await phoneDuplicateStatus(Lead, lead.phone, lead._id);
    lead.verification.status = dupe.status;
    lead.verification.note = dupe.note;
    if (wasRejected) {
      setVerification(lead, "verification", dupe.status, `Resubmitted by ${req.user.name}`, req.user._id);
      await lead.save();
      await pushNotification(lead, `${req.user.name} edited and resubmitted this lead for review.`);
      return res.json({ lead });
    }
    await lead.save();
    await pushNotification(lead, `${req.user.name} edited this lead's details.`);
    return res.json({ lead });
  }
  await lead.save();
  await pushNotification(lead, `${req.user.name} updated details on this lead after it was already verified.`);
  res.json({ lead });
}

async function reassignLead(req, res) {
  if (!hasOrgWideAccess(req.user.role)) return res.status(403).json({ error: "Not permitted for your role" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  lead.partnerId = req.body.partnerId;
  await lead.save();
  await pushNotification(lead, `${req.user.name} reassigned this lead.`);
  res.json({ lead });
}

async function advanceStage(req, res) {
  if (!canUpdateStage(req.user)) return res.status(403).json({ error: "Not permitted for your role" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const next = nextStage(lead.stage);
  if (!next) return res.status(400).json({ error: "This lead is already at the final stage" });
  if (lead.verification.status !== "verified") {
    return res.status(400).json({ error: "Verify this lead before progressing its stage" });
  }

  const b = req.body;
  if (next === "Login Done") {
    if (!b.bankName || !b.dsaCode?.trim() || !b.appId?.trim()) {
      return res.status(400).json({ error: "Bank, DSA code and Application ID are all required to move to Login Done" });
    }
    lead.bankName = b.bankName;
    lead.dsaCode = b.dsaCode.trim();
    lead.appId = b.appId.trim();
  } else if (next === "Sanction Done") {
    lead.sanctionAmount = Number(b.sanctionAmount) || 0;
  } else if (next === "Disbursement Done") {
    if (!b.proofPhotoUrl?.trim()) {
      return res.status(400).json({ error: "Proof document (cheque photo, bank transfer screenshot, or disbursement email) is required to record disbursement" });
    }
    lead.disbursement.amount = Number(b.disbAmount) || 0;
    lead.disbursement.date = b.disbDate ? new Date(b.disbDate) : new Date();
    lead.disbursement.proofPhotoUrl = b.proofPhotoUrl;
    lead.disbursement.proofNote = b.proofNote?.trim() || "";
    setVerification(lead, "finalVerification", "draft", "", req.user._id);
  }
  lead.stage = next;
  lead.stageHistory.push({ stage: next, at: new Date() });
  await lead.save();

  // Emit real-time update to all connected clients
  req.app.io.emit("lead:updated", { leadId: lead._id, stage: lead.stage, updatedBy: req.user.name });

  await pushNotification(
    lead,
    next === "Disbursement Done"
      ? `${req.user.name} entered disbursement details for this lead — ready to review and submit for final verification.`
      : `${req.user.name} moved this lead to "${next}".`
  );
  res.json({ lead });
}

// Corrective, Admin-only: moves a lead BACK to an earlier stage (e.g. it was
// advanced by mistake). Forward movement must still go through advanceStage,
// which enforces the required fields per stage — this only ever demotes.
async function setStage(req, res) {
  if (!hasOrgWideAccess(req.user.role)) return res.status(403).json({ error: "Not permitted for your role" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const { stage } = req.body;
  if (!STAGES.includes(stage)) return res.status(400).json({ error: "Invalid stage" });
  const currentIdx = STAGES.indexOf(lead.stage);
  const targetIdx = STAGES.indexOf(stage);
  if (targetIdx > currentIdx) {
    return res.status(400).json({ error: "Use Advance to move a lead forward — this action only corrects the stage backward." });
  }
  if (targetIdx === currentIdx) return res.json({ lead });

  lead.stage = stage;
  lead.stageHistory.push({ stage, at: new Date() });
  // Leaving Disbursement Done invalidates any in-flight or decided final
  // check — otherwise re-advancing later would arrive already "Completed".
  if (targetIdx < STAGES.indexOf("Disbursement Done") && lead.finalVerification.status !== "not_applicable") {
    lead.finalVerification.status = "not_applicable";
    lead.finalVerification.note = "";
  }
  await lead.save();

  // Emit real-time update to all connected clients
  req.app.io.emit("lead:updated", { leadId: lead._id, stage: lead.stage, updatedBy: req.user.name });

  await pushNotification(lead, `${req.user.name} moved this lead back to "${stage}".`);
  res.json({ lead });
}

async function editStageDetails(req, res) {
  if (!canUpdateStage(req.user)) return res.status(403).json({ error: "Not permitted for your role" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const idx = STAGES.indexOf(lead.stage);
  const b = req.body;
  if (idx >= 2 && b.bankName !== undefined) {
    lead.bankName = b.bankName;
    lead.dsaCode = b.dsaCode?.trim() || "";
    lead.appId = b.appId?.trim() || "";
  }
  if (idx >= 3 && b.sanctionAmount !== undefined) {
    lead.sanctionAmount = Number(b.sanctionAmount) || 0;
  }
  if (idx >= 4 && b.disbAmount !== undefined) {
    lead.disbursement.amount = Number(b.disbAmount) || 0;
    if (b.disbDate) lead.disbursement.date = new Date(b.disbDate);
    lead.disbursement.proofNote = b.proofNote?.trim() ?? lead.disbursement.proofNote;
    if (b.proofPhotoUrl) lead.disbursement.proofPhotoUrl = b.proofPhotoUrl;
  }
  await lead.save();
  await pushNotification(lead, `${req.user.name} edited stage details for this lead.`);
  res.json({ lead });
}

async function submitFinalVerification(req, res) {
  if (!canUpdateStage(req.user)) return res.status(403).json({ error: "Not permitted for your role" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (lead.finalVerification.status !== "draft") {
    return res.status(400).json({ error: "This lead isn't awaiting submission" });
  }
  const b = req.body;
  Object.assign(lead, {
    customerName: b.customerName?.trim() ?? lead.customerName,
    phone: b.phone?.trim() ?? lead.phone,
    altPhone: b.altPhone?.trim() ?? lead.altPhone,
    email: b.email?.trim() ?? lead.email,
    loanAmount: b.loanAmount !== undefined ? Number(b.loanAmount) || 0 : lead.loanAmount,
    monthlyIncome: b.monthlyIncome !== undefined ? Number(b.monthlyIncome) || 0 : lead.monthlyIncome,
    employmentType: b.employmentType ?? lead.employmentType,
    leadSource: b.leadSource ?? lead.leadSource,
    leadChannel: b.leadChannel ?? lead.leadChannel,
    city: b.city?.trim() ?? lead.city,
    occupation: b.occupation?.trim() ?? lead.occupation,
    notes: b.notes?.trim() ?? lead.notes,
  });
  if (b.verificationProofUrl) lead.verificationProofUrl = b.verificationProofUrl;
  setVerification(lead, "finalVerification", "pending", "", req.user._id);
  await lead.save();
  await pushNotification(lead, `${req.user.name} submitted this lead for final verification — it can no longer be edited.`);
  res.json({ lead });
}

async function fixDisbursement(req, res) {
  if (!canUpdateStage(req.user)) return res.status(403).json({ error: "Not permitted for your role" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (lead.finalVerification.status !== "rejected") {
    return res.status(400).json({ error: "This lead wasn't rejected at final check" });
  }
  const b = req.body;
  lead.disbursement.amount = Number(b.disbAmount) || 0;
  lead.disbursement.date = b.disbDate ? new Date(b.disbDate) : lead.disbursement.date;
  lead.disbursement.proofNote = b.proofNote?.trim() || "";
  if (b.proofPhotoUrl) lead.disbursement.proofPhotoUrl = b.proofPhotoUrl;
  setVerification(lead, "finalVerification", "pending", `Resubmitted by ${req.user.name}`, req.user._id);
  await lead.save();
  await pushNotification(lead, `${req.user.name} fixed and resubmitted disbursement details for the final check.`);
  res.json({ lead });
}

async function closeLead(req, res) {
  if (!canUpdateStage(req.user)) return res.status(403).json({ error: "Not permitted for your role" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const { status, reason } = req.body;
  if (!["withdrawn", "declined"].includes(status)) return res.status(400).json({ error: "Invalid closure status" });
  lead.closure = { status, reason: (reason || "").trim(), by: req.user._id, at: new Date() };
  await lead.save();
  await pushNotification(
    lead,
    `${req.user.name} closed this lead as "${status === "withdrawn" ? "Withdrawn" : "Declined"}". Reason: ${lead.closure.reason}`
  );
  res.json({ lead });
}

async function reopenLead(req, res) {
  if (!hasOrgWideAccess(req.user.role)) return res.status(403).json({ error: "Not permitted for your role" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  lead.closure = { status: "open", reason: "", by: null, at: null };
  await lead.save();
  await pushNotification(lead, `${req.user.name} reopened this lead.`);
  res.json({ lead });
}

async function requestDeleteLead(req, res) {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  // Only approved leads require deletion request
  if (lead.verification.status !== "verified") {
    return res.status(400).json({ error: "Can only request deletion for verified leads" });
  }

  // Check if user has access to this lead
  if (!(await assertVisible(req, lead))) {
    return res.status(403).json({ error: "Not visible to you" });
  }

  // Check if deletion already requested or approved
  if (lead.deletionRequest.status === "pending") {
    return res.status(400).json({ error: "Deletion already requested" });
  }
  if (lead.deletionRequest.status === "approved") {
    return res.status(400).json({ error: "Deletion already approved" });
  }

  // Request deletion
  lead.deletionRequest = {
    status: "pending",
    requestedBy: req.user._id,
    requestedAt: new Date(),
    reason: req.body.reason || "",
  };
  await lead.save();
  res.json({ lead });
}

async function approveDeleteRequest(req, res) {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Admin only" });

  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  if (lead.deletionRequest.status !== "pending") {
    return res.status(400).json({ error: "No pending deletion request" });
  }

  const { approve } = req.body;

  if (approve) {
    // Delete the lead
    lead.deletionRequest.status = "approved";
    lead.deletionRequest.approvedBy = req.user._id;
    lead.deletionRequest.approvedAt = new Date();

    const attachments = await Attachment.find({ leadId: lead._id });
    await Promise.all(attachments.map((a) => deleteStoredFile(a.url)));
    await Promise.all([
      AccountingEntry.deleteMany({ leadId: lead._id }),
      Expense.deleteMany({ leadId: lead._id }),
      Reminder.deleteMany({ leadId: lead._id }),
      Note.deleteMany({ leadId: lead._id }),
      Attachment.deleteMany({ leadId: lead._id }),
      lead.deleteOne(),
    ]);
    res.json({ ok: true, message: "Lead deleted" });
  } else {
    // Reject deletion request
    lead.deletionRequest.status = "rejected";
    lead.deletionRequest.approvedBy = req.user._id;
    lead.deletionRequest.approvedAt = new Date();
    await lead.save();
    res.json({ lead, message: "Deletion request rejected" });
  }
}

async function deleteLead(req, res) {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Admin only" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  // Prevent deletion if lead is verified (approved)
  if (lead.verification.status === "verified") {
    return res.status(403).json({ error: "Cannot delete verified leads. Please request deletion instead." });
  }

  const attachments = await Attachment.find({ leadId: lead._id });
  await Promise.all(attachments.map((a) => deleteStoredFile(a.url)));
  await Promise.all([
    AccountingEntry.deleteMany({ leadId: lead._id }),
    Expense.deleteMany({ leadId: lead._id }),
    Reminder.deleteMany({ leadId: lead._id }),
    Note.deleteMany({ leadId: lead._id }),
    Attachment.deleteMany({ leadId: lead._id }),
    lead.deleteOne(),
  ]);
  res.json({ ok: true });
}

module.exports = {
  listLeads,
  getLead,
  createLead,
  updateLead,
  reassignLead,
  advanceStage,
  setStage,
  editStageDetails,
  submitFinalVerification,
  fixDisbursement,
  closeLead,
  reopenLead,
  requestDeleteLead,
  approveDeleteRequest,
  deleteLead,
};
