const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/accountingController"));

const router = express.Router();
router.use(requireAuth);

router.get("/", ctrl.listAccounting);
router.get("/:leadId/:field", ctrl.getEntry);
router.patch("/:leadId/:field/rate", ctrl.setRate);
router.patch("/:leadId/:field/expected", ctrl.setExpected);
router.patch("/:leadId/:field/invoice-raised", ctrl.setInvoiceRaised);
router.post("/:leadId/:field/installments", ctrl.addInstallment);
router.delete("/:leadId/:field/installments/:idx", ctrl.removeInstallment);
router.patch("/:leadId/:field/installments/:idx/reconcile", ctrl.reconcileInstallment);

module.exports = router;
