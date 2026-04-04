import express from "express";
import mongoose from "mongoose";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import {
  calculateDiscountedPrice,
  createDisabledFlashSale,
  normalizeFlashSalePayload,
} from "../services/productService.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hashPassword } from "../utils/passwords.js";

const router = express.Router();

const serializeManager = (user) => ({
  id: user._id.toString(),
  email: user.email,
  displayName: user.displayName,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

router.patch(
  "/flash-sales",
  requireAuth,
  requireRoles("product_manager", "super_admin"),
  asyncHandler(async (req, res) => {
    const action = req.body.action;

    if (!["apply", "clear"].includes(action)) {
      return res.status(400).json({ message: 'action must be "apply" or "clear".' });
    }

    const rawProductIds = Array.isArray(req.body.productIds) ? req.body.productIds : [];
    const invalidProductIds = rawProductIds.filter((productId) => !mongoose.isValidObjectId(productId));

    if (invalidProductIds.length > 0) {
      return res.status(400).json({ message: "productIds must contain valid product ids." });
    }

    const productIds = [...new Set(rawProductIds.map((productId) => `${productId}`))];
    if (productIds.length === 0) {
      return res.status(400).json({ message: "Select at least one product." });
    }

    const matchedProducts = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    })
      .select("_id price")
      .lean();
    const matchedIds = matchedProducts.map((product) => product._id.toString());

    if (matchedIds.length === 0) {
      return res.json({
        action,
        matchedCount: 0,
        updatedCount: 0,
        updatedIds: [],
      });
    }

    let flashSaleUpdate = createDisabledFlashSale();

    if (action === "apply") {
      const { flashSale, errors } = normalizeFlashSalePayload(req.body.flashSale, { allowDisabled: false });

      if (errors.length > 0) {
        return res.status(400).json({ message: errors.join(" ") });
      }

      flashSaleUpdate = flashSale;
    }

    let updatedCount = 0;

    if (action === "apply") {
      const bulkOperations = matchedProducts.map((product) => ({
        updateOne: {
          filter: { _id: product._id, isActive: true },
          update: {
            $set: {
              flashSale: {
                ...flashSaleUpdate,
                salePrice: calculateDiscountedPrice(product.price, flashSaleUpdate.discountPercent),
              },
            },
          },
        },
      }));

      const result = await Product.bulkWrite(bulkOperations);
      updatedCount = result.modifiedCount;
    } else {
      const result = await Product.updateMany(
        { _id: { $in: matchedIds } },
        { $set: { flashSale: flashSaleUpdate } }
      );
      updatedCount = result.modifiedCount;
    }

    res.json({
      action,
      matchedCount: matchedIds.length,
      updatedCount,
      updatedIds: matchedIds,
    });
  })
);

router.use(requireAuth, requireRoles("super_admin"));

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

router.delete(
  "/product-managers/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const manager = await User.findOneAndDelete({ _id: id, role: "product_manager" });

    if (!manager) {
      return res.status(404).json({ message: "Product manager not found." });
    }

    res.json({ deletedId: id });
  })
);

export default router;
