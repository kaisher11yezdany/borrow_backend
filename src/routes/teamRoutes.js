const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/teamController"));

const router = express.Router();
router.use(requireAuth);

router.get("/", ctrl.getTeam);
router.get("/all", ctrl.listAllUsers);
router.post("/users", ctrl.addUser);
router.patch("/users/:id", ctrl.updateUser);
router.delete("/users/:id", ctrl.deleteUser);

module.exports = router;
