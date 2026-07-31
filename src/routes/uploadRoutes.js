const express = require("express");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const asyncHandler = require("../utils/asyncHandler");
const { uploadImage } = require("../controllers/uploadController");

const router = express.Router();
router.use(requireAuth);

router.post("/image", upload.single("image"), asyncHandler(uploadImage));

module.exports = router;
