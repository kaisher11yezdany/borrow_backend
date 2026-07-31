const Notification = require("../models/Notification");
const { stakeholdersForLead } = require("./hierarchy");

async function pushNotification(lead, message) {
  const stakeholderIds = await stakeholdersForLead(lead);
  await Notification.create({
    leadId: lead._id,
    customerName: lead.customerName,
    message,
    stakeholderIds,
  });
}

module.exports = { pushNotification };
