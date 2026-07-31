const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/notificationController"));

const router = express.Router();
router.use(requireAuth);

router.get("/", ctrl.list);

module.exports = router;
