const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/verificationController"));

const router = express.Router();
router.use(requireAuth);

router.get("/queue", ctrl.getQueues);
router.post("/:id/:field/approve", ctrl.approve);
router.post("/:id/:field/reject", ctrl.reject);

module.exports = router;
