const Lead = require("../models/Lead");
const User = require("../models/User");
const { canUpdateStage } = require("../utils/permissions");

exports.assignBackendTeam = async (req, res) => {
  const { id: leadId } = req.params;
  const { userId } = req.body;
  const currentUser = req.user;

  try {
    // Check permissions: only Admin and Manager can assign
    if (!canUpdateStage(currentUser)) {
      return res.status(403).json({ error: "Only Admin and Manager can assign backend team" });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Check if lead is verified (manager approval done)
    if (lead.verification.status !== "verified") {
      return res.status(400).json({ error: "Lead must be verified before assigning backend team" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already assigned
    const alreadyAssigned = lead.backendTeamAssignments.some(
      (a) => a.userId.toString() === userId
    );
    if (alreadyAssigned) {
      return res.status(400).json({ error: "User already assigned to this lead" });
    }

    // Add assignment
    lead.backendTeamAssignments.push({
      userId,
      assignedBy: currentUser._id,
      assignedAt: new Date(),
    });

    await lead.save();

    // Populate and return
    await lead.populate([
      { path: "backendTeamAssignments.userId", select: "name email role" },
      { path: "backendTeamAssignments.assignedBy", select: "name email" },
    ]);

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.unassignBackendTeam = async (req, res) => {
  const { id: leadId } = req.params;
  const { userId } = req.body;
  const currentUser = req.user;

  try {
    // Check permissions: only Admin and Manager can unassign
    if (!canUpdateStage(currentUser)) {
      return res.status(403).json({ error: "Only Admin and Manager can unassign backend team" });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Remove assignment
    lead.backendTeamAssignments = lead.backendTeamAssignments.filter(
      (a) => a.userId.toString() !== userId
    );

    await lead.save();

    // Populate and return
    await lead.populate([
      { path: "backendTeamAssignments.userId", select: "name email role" },
      { path: "backendTeamAssignments.assignedBy", select: "name email" },
    ]);

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBackendTeamMembers = async (req, res) => {
  try {
    // Get all users with Backend role
    const backendUsers = await User.find({ role: "Backend" }).select("_id name email role");
    res.json({ users: backendUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
