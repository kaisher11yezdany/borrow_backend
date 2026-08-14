const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/leadController"));

const router = express.Router();
router.use(requireAuth);

router.get("/", ctrl.listLeads);
router.post("/", ctrl.createLead);
router.get("/:id", ctrl.getLead);
router.patch("/:id", ctrl.updateLead);
router.patch("/:id/reassign", ctrl.reassignLead);
router.post("/:id/advance-stage", ctrl.advanceStage);
router.post("/:id/set-stage", ctrl.setStage);
router.patch("/:id/stage-details", ctrl.editStageDetails);
router.post("/:id/submit-final-verification", ctrl.submitFinalVerification);
router.post("/:id/fix-disbursement", ctrl.fixDisbursement);
router.post("/:id/close", ctrl.closeLead);
router.post("/:id/reopen", ctrl.reopenLead);
router.post("/:id/request-delete", ctrl.requestDeleteLead);
router.post("/:id/approve-delete", ctrl.approveDeleteRequest);
router.delete("/:id", ctrl.deleteLead);

module.exports = router;
