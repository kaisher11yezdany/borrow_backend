const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getOrCreateKYC, updateKYC, addReference, removeReference, shareKYC, revokeAllKYCAccess, getKYCByToken, updateKYCByToken } = require("../controllers/kycController");

const router = express.Router();

// Public routes - must be before parameterized routes
router.get("/public/:token", getKYCByToken);
router.put("/public/:token", updateKYCByToken);

// Protected routes
router.get("/:leadId", requireAuth, getOrCreateKYC);
router.put("/:leadId", requireAuth, updateKYC);
router.post("/:leadId/references", requireAuth, addReference);
router.delete("/:leadId/references/:referenceId", requireAuth, removeReference);
router.post("/:leadId/share", requireAuth, shareKYC);
router.post("/:leadId/revoke-all", requireAuth, revokeAllKYCAccess);

module.exports = router;
