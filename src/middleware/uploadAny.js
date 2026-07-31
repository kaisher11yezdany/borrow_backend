const multer = require("multer");

// Unlike middleware/upload.js (images only, for KYC/disbursement proof),
// this accepts any file type for the general per-lead attachments feature.
const storage = multer.memoryStorage();
const uploadAny = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

module.exports = uploadAny;
