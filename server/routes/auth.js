import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { comparePassword, hashPassword } from "../utils/passwords.js";
import { signToken } from "../utils/tokens.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const serializeUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  displayName: user.displayName,
  role: user.role,
  isActive: user.isActive,
});

router.post(
  "/register",
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

    const user = await User.create({
      email: normalizedEmail,
      displayName: `${displayName}`.trim(),
      passwordHash: await hashPassword(password),
      role: "customer",
    });

    res.status(201).json({
      token: signToken(user),
      user: serializeUser(user),
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: `${email}`.trim().toLowerCase() });

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "This account has been deactivated." });
    }

    res.json({
      token: signToken(user),
      user: serializeUser(user),
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      user: serializeUser(user),
    });
  })
);

export default router;
