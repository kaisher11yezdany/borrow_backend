const { Forum } = require("../models/Forum");
const Lead = require("../models/Lead");
const crypto = require("crypto");

function generateUniqueToken() {
  return crypto.randomBytes(16).toString("hex");
}

async function getOrCreateForum(req, res) {
  try {
    const { leadId } = req.params;
    let forum = await Forum.findOne({ leadId });

    if (!forum) {
      const lead = await Lead.findById(leadId);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      forum = new Forum({
        leadId,
        leadName: lead.customerName,
        uniqueToken: generateUniqueToken(),
        internalParticipants: [lead.partnerId],
      });
      await forum.save();
    }

    res.json(forum);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function shareForum(req, res) {
  try {
    const { leadId } = req.params;
    const { emails } = req.body;

    let forum = await Forum.findOne({ leadId });
    if (!forum) return res.status(404).json({ error: "Forum not found" });

    emails.forEach((email) => {
      if (!forum.sharedWith.find((s) => s.email === email)) {
        forum.sharedWith.push({ email, accessGrantedAt: new Date() });
      }
    });

    forum.isShared = true;
    forum.updatedAt = new Date();
    await forum.save();

    res.json({
      success: true,
      forumId: forum._id,
      token: forum.uniqueToken,
      shareLink: `${process.env.FRONTEND_URL}/forum/${forum.uniqueToken}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function unshareForum(req, res) {
  try {
    const { leadId } = req.params;
    const { email } = req.body;

    const forum = await Forum.findOne({ leadId });
    if (!forum) return res.status(404).json({ error: "Forum not found" });

    forum.sharedWith = forum.sharedWith.filter((s) => s.email !== email);

    if (forum.sharedWith.length === 0) {
      forum.isShared = false;
    }

    forum.updatedAt = new Date();
    await forum.save();

    res.json(forum);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function revokeAllAccess(req, res) {
  try {
    const { leadId } = req.params;

    const forum = await Forum.findOne({ leadId });
    if (!forum) return res.status(404).json({ error: "Forum not found" });

    forum.sharedWith = [];
    forum.isShared = false;
    forum.updatedAt = new Date();
    await forum.save();

    res.json({ success: true, message: "All external access revoked" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function addMessage(req, res) {
  try {
    const { leadId } = req.params;
    const { message, attachmentUrl } = req.body;
    const { id: userId, name: senderName, role } = req.user;

    let forum = await Forum.findOne({ leadId });
    if (!forum) return res.status(404).json({ error: "Forum not found" });

    const newMessage = {
      forumId: forum._id,
      senderId: userId,
      senderName,
      senderRole: role,
      message,
      attachmentUrl,
    };

    forum.messages.push(newMessage);
    forum.updatedAt = new Date();
    await forum.save();

    res.json(forum);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getForumByToken(req, res) {
  try {
    const { token } = req.params;

    const forum = await Forum.findOne({ uniqueToken: token });
    if (!forum) return res.status(404).json({ error: "Forum not found" });

    if (!forum.isShared) {
      return res.status(403).json({ error: "This forum link is not accessible" });
    }

    // Return forum with messages
    res.json({
      _id: forum._id,
      leadName: forum.leadName,
      messages: forum.messages,
      isShared: forum.isShared,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getOrCreateForum,
  shareForum,
  unshareForum,
  revokeAllAccess,
  addMessage,
  getForumByToken,
};
