const { STAGES } = require("../config/constants");

function isClosed(lead) {
  return lead.closure && lead.closure.status !== "open";
}

async function phoneDuplicateStatus(Lead, phone, excludeId) {
  const dupe = await Lead.findOne({ phone, _id: { $ne: excludeId } });
  if (dupe) return { status: "duplicate_flag", note: `Same phone number as lead ${dupe._id}` };
  return { status: "pending", note: "" };
}

function setVerification(lead, field, status, note, byId) {
  lead[field].status = status;
  lead[field].note = note || "";
  lead[field].history = lead[field].history || [];
  lead[field].history.push({ status, note: note || "", at: new Date(), by: byId });
}

function nextStage(stage) {
  const idx = STAGES.indexOf(stage);
  return STAGES[idx + 1] || null;
}

module.exports = { isClosed, phoneDuplicateStatus, setVerification, nextStage };
