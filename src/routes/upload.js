const express = require("express");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { upload } = require("../middleware/upload");
const { requireAuth } = require("../middleware/requireAuth");

function uploadRouter({ jwtSecret, requireAuth }) {
  const router = express.Router();

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, "../../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // POST /api/admin/upload - Upload and optimize image
  router.post("/", requireAuth(jwtSecret), upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 9);
      const ext = path.extname(req.file.originalname) || ".jpg";
      const filename = `product_${timestamp}_${randomStr}${ext}`;
      const filepath = path.join(uploadsDir, filename);

      // Optimize and save image
      // Resize to max 1200px width, convert to JPEG with quality 85, and strip metadata
      await sharp(req.file.buffer)
        .resize(1200, 1200, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(filepath);

      // Get file size after optimization
      const stats = fs.statSync(filepath);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Return the URL path (relative to /uploads)
      const imageUrl = `/uploads/${filename}`;

      return res.json({
        imageUrl,
        filename,
        size: stats.size,
        sizeMB: fileSizeInMB,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      return res.status(500).json({ error: "Failed to process image: " + error.message });
    }
  });

  return router;
}

module.exports = { uploadRouter };

