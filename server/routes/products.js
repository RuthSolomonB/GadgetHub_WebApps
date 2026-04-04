import express from "express";
import { attachOptionalUser, requireAuth, requireRoles } from "../middleware/auth.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  ensureValidObjectId,
  listProducts,
  normalizeProductPayload,
  serializeProduct,
} from "../services/productService.js";

const router = express.Router();

const resolveViewerRole = (req) => req.user?.role || "guest";

router.use(attachOptionalUser);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await listProducts(req.query, resolveViewerRole(req));
    res.json(result);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!ensureValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id." });
    }

    const product = await Product.findById(id).lean();

    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json(serializeProduct(product, resolveViewerRole(req)));
  })
);

router.post(
  "/",
  requireAuth,
  requireRoles("product_manager", "super_admin"),
  asyncHandler(async (req, res) => {
    const { payload, errors } = normalizeProductPayload(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const product = await Product.create(payload);
    res.status(201).json(serializeProduct(product, req.user.role));
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRoles("product_manager", "super_admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!ensureValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id." });
    }

    const { payload, errors } = normalizeProductPayload(req.body, { partial: true });

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const product = await Product.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json(serializeProduct(product, req.user.role));
  })
);

export default router;
