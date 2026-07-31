const express = require("express");
const { requireAuth } = require("../middleware/auth");
const uploadAny = require("../middleware/uploadAny");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/attachmentController"));

const router = express.Router();
router.use(requireAuth);

router.get("/lead/:leadId", ctrl.listForLead);
router.post("/lead/:leadId", uploadAny.array("files", 10), ctrl.addAttachments);
router.patch("/:id", uploadAny.array("files", 1), ctrl.updateAttachment);
router.delete("/:id", ctrl.removeAttachment);

module.exports = router;
