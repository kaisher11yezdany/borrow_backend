const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/expenseController"));

const router = express.Router();
router.use(requireAuth);

router.get("/:leadId", ctrl.listForLead);
router.post("/:leadId", ctrl.addExpense);
router.delete("/:id", ctrl.removeExpense);

module.exports = router;
