const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");
const sharp = require("sharp");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

function randomName(ext) {
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
}

// Images are re-encoded/compressed (same idea as the KYC/disbursement proof
// uploads); everything else is stored as-is under its original extension.
async function saveUploadedFile(file) {
  const isImage = file.mimetype && file.mimetype.startsWith("image/");
  if (isImage) {
    const filename = randomName(".jpg");
    const outPath = path.join(UPLOAD_DIR, filename);
    await sharp(file.buffer).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 75 }).toFile(outPath);
    const stat = await fs.stat(outPath);
    return { url: `/uploads/${filename}`, mimeType: "image/jpeg", size: stat.size };
  }
  const ext = path.extname(file.originalname || "").slice(0, 10);
  const filename = randomName(ext);
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return { url: `/uploads/${filename}`, mimeType: file.mimetype || "application/octet-stream", size: file.buffer.length };
}

async function deleteStoredFile(url) {
  if (!url || !url.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOAD_DIR, path.basename(url));
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") console.error("Failed to delete file", filePath, err);
  }
}

module.exports = { saveUploadedFile, deleteStoredFile, UPLOAD_DIR };
