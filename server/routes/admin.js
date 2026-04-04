import express from "express";
import mongoose from "mongoose";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hashPassword } from "../utils/passwords.js";

const router = express.Router();

router.use(requireAuth, requireRoles("super_admin"));

const serializeManager = (user) => ({
  id: user._id.toString(),
  email: user.email,
  displayName: user.displayName,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

router.get(
  "/product-managers",
  asyncHandler(async (_req, res) => {
    const managers = await User.find({ role: "product_manager" }).sort({ createdAt: -1 }).lean();
    res.json({ items: managers.map(serializeManager) });
  })
);

router.post(
  "/product-managers",
  asyncHandler(async (req, res) => {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: "Email, password, and display name are required." });
    }

    const normalizedEmail = `${email}`.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();

    if (existingUser) {
      return res.status(409).json({ message: "An account already exists for that email address." });
    }

    const manager = await User.create({
      email: normalizedEmail,
      displayName: `${displayName}`.trim(),
      passwordHash: await hashPassword(password),
      role: "product_manager",
    });

    res.status(201).json({ user: serializeManager(manager) });
  })
);

router.patch(
  "/product-managers/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const update = {};

    if (req.body.displayName !== undefined) {
      update.displayName = `${req.body.displayName}`.trim();
    }

    if (req.body.isActive !== undefined) {
      update.isActive = Boolean(req.body.isActive);
    }

    if (req.body.password) {
      update.passwordHash = await hashPassword(req.body.password);
    }

    const manager = await User.findOneAndUpdate(
      { _id: id, role: "product_manager" },
      update,
      { new: true, runValidators: true }
    );

    if (!manager) {
      return res.status(404).json({ message: "Product manager not found." });
    }

    res.json({ user: serializeManager(manager) });
  })
);

export default router;
