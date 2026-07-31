const path = require("path");
const crypto = require("crypto");
const fs = require("fs").promises;
const sharp = require("sharp");
const { UPLOAD_DIR } = require("../utils/fileStorage");

// Handle image uploads (compress) and document uploads (store as-is)
async function uploadImage(req, res) {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const isImage = req.file.mimetype.startsWith("image/");

  if (isImage) {
    // Image: compress and convert to JPEG
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.jpg`;
    const outPath = path.join(UPLOAD_DIR, filename);
    try {
      await sharp(req.file.buffer)
        .resize({ width: 600, withoutEnlargement: true })
        .jpeg({ quality: 60 })
        .toFile(outPath);
    } catch (err) {
      return res.status(400).json({ error: "Couldn't process that image — it may be corrupted or an unsupported format." });
    }
    res.status(201).json({ url: `/uploads/${filename}` });
  } else {
    // Document (PDF, DOCX, DOC): store with original extension
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    const outPath = path.join(UPLOAD_DIR, filename);
    try {
      await fs.writeFile(outPath, req.file.buffer);
    } catch (err) {
      return res.status(400).json({ error: "Couldn't save the document — please try again." });
    }
    res.status(201).json({ url: `/uploads/${filename}` });
  }
}

module.exports = { uploadImage, UPLOAD_DIR };
