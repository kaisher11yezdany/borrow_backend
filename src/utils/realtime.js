// Every lead mutation broadcasts the same event; connected clients react by
// refetching rather than patching state from the payload, so the payload only
// needs to say which lead moved and who moved it.
function emitLeadUpdate(req, lead) {
  if (!req.app.io) return;
  req.app.io.emit("lead:updated", {
    leadId: String(lead._id),
    stage: lead.stage,
    updatedBy: req.user?.name,
  });
}

module.exports = { emitLeadUpdate };
