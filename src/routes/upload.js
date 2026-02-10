const express = require("express");
const sharp = require("sharp");
const { upload } = require("../middleware/upload");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
const { getEnv } = require("../env");

function uploadRouter({ jwtSecret, requireAuth }) {
  const router = express.Router();

  // Configure Cloudinary
  const env = getEnv();
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
  });

  // POST /api/admin/upload - Upload and optimize image
  router.post("/", requireAuth(jwtSecret), upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Optimize image buffer with sharp locally first
      const optimizedBuffer = await sharp(req.file.buffer)
        .resize(1200, 1200, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      // Upload to Cloudinary using a stream
      const uploadToCloudinary = (buffer) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "products",
              resource_type: "image",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          Readable.from(buffer).pipe(uploadStream);
        });
      };

      const result = await uploadToCloudinary(optimizedBuffer);

      return res.json({
        imageUrl: result.secure_url,
        filename: result.public_id,
        size: result.bytes,
        sizeMB: (result.bytes / (1024 * 1024)).toFixed(2),
      });

    } catch (error) {
      console.error("Image upload error:", error);
      return res.status(500).json({ error: "Failed to process image: " + error.message });
    }
  });

  return router;
}

module.exports = { uploadRouter };
