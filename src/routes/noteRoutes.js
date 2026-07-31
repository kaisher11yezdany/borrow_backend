const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/noteController"));

const router = express.Router();
router.use(requireAuth);

router.get("/lead/:leadId", ctrl.listForLead);
router.post("/lead/:leadId", ctrl.addNote);
router.patch("/:id", ctrl.updateNote);
router.delete("/:id", ctrl.removeNote);

module.exports = router;
