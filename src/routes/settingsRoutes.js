const express = require("express");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const ctrl = require("../controllers/settingsController");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(ctrl.getAllSettings));

router.post("/products", asyncHandler(ctrl.productHandlers.add));
router.patch("/products/:id/toggle", asyncHandler(ctrl.productHandlers.toggleActive));
router.patch("/products/:id/color", asyncHandler(ctrl.productHandlers.setColor));

router.post("/banks/:product", asyncHandler(ctrl.addBank));
router.patch("/banks/:id/toggle", asyncHandler(ctrl.toggleBankActive));

router.post("/expense-types", asyncHandler(ctrl.expenseTypeHandlers.add));
router.patch("/expense-types/:id/toggle", asyncHandler(ctrl.expenseTypeHandlers.toggleActive));

router.post("/company-bank-accounts", asyncHandler(ctrl.companyBankAccountHandlers.add));
router.patch("/company-bank-accounts/:id/toggle", asyncHandler(ctrl.companyBankAccountHandlers.toggleActive));

router.post("/digital-channels", asyncHandler(ctrl.digitalChannelHandlers.add));
router.patch("/digital-channels/:id/toggle", asyncHandler(ctrl.digitalChannelHandlers.toggleActive));

module.exports = router;
