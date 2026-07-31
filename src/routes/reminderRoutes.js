const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/reminderController"));

const router = express.Router();
router.use(requireAuth);

router.get("/board", ctrl.listBoard);
router.get("/lead/:leadId", ctrl.listForLead);
router.post("/lead/:leadId", ctrl.addReminder);
router.patch("/:id/done", ctrl.markDone);
router.patch("/:id/pending", ctrl.markPending);
router.delete("/:id", ctrl.remove);

module.exports = router;
