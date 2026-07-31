const multer = require("multer");

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error("Only image files (JPEG, PNG, GIF), PDF, and Word documents are allowed"));
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 8 * 1024 * 1024 } });

module.exports = upload;
