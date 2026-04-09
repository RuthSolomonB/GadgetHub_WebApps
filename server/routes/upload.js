import express from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { buildS3ObjectUrl, upload } from "../upload.js";

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireRoles("product_manager", "super_admin"),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    if (!req.file.location) {
      return res.status(503).json({
        message: "S3 uploads are not configured for this environment. Provide an image URL manually or configure S3.",
      });
    }

    res.json({ imageUrl: buildS3ObjectUrl(req.file.key) });
  })
);

export default router;
