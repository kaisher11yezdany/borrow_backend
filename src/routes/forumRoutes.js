const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getOrCreateForum,
  shareForum,
  unshareForum,
  revokeAllAccess,
  addMessage,
  getForumByToken,
} = require("../controllers/forumController");

const router = express.Router();

// Authenticated routes
router.get("/:leadId", requireAuth, getOrCreateForum);
router.post("/:leadId/share", requireAuth, shareForum);
router.post("/:leadId/unshare", requireAuth, unshareForum);
router.post("/:leadId/revoke-all", requireAuth, revokeAllAccess);
router.post("/:leadId/messages", requireAuth, addMessage);

// Public route (shared link)
router.get("/public/:token", getForumByToken);

module.exports = router;
