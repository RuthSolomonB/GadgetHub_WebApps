import express from "express";
import mongoose from "mongoose";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { getActiveFlashSale } from "../services/productService.js";
import asyncHandler from "../utils/asyncHandler.js";
import { buildCartResponse } from "../utils/cart.js";

const router = express.Router();

router.use(requireAuth, requireRoles("customer"));

const getCartForUser = async (userId) =>
  Cart.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, items: [] } },
    { new: true, upsert: true }
  );

const getAvailableQty = (product) => {
  const activeFlashSale = getActiveFlashSale(product);
  return activeFlashSale ? activeFlashSale.saleStockQty : product.stockQty;
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cart = await getCartForUser(req.user.id);
    res.json(await buildCartResponse(cart));
  })
);

router.post(
  "/items",
  asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "A valid productId is required." });
    }

    const nextQuantity = Number(quantity);

    if (!Number.isInteger(nextQuantity) || nextQuantity <= 0) {
      return res.status(400).json({ message: "quantity must be a positive integer." });
    }

    const product = await Product.findById(productId).lean();

    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found." });
    }

    const cart = await getCartForUser(req.user.id);
    const existingItem = cart.items.find((item) => item.productId.toString() === productId);

    const requestedQuantity = existingItem ? existingItem.quantity + nextQuantity : nextQuantity;

    if (requestedQuantity > getAvailableQty(product)) {
      return res.status(400).json({ message: "Requested quantity exceeds available inventory." });
    }

    if (existingItem) {
      existingItem.quantity = requestedQuantity;
    } else {
      cart.items.push({ productId, quantity: nextQuantity });
    }

    await cart.save();

    res.status(201).json(await buildCartResponse(cart));
  })
);

router.patch(
  "/items/:productId",
  asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const nextQuantity = Number(req.body.quantity);

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product id." });
    }

    if (!Number.isInteger(nextQuantity) || nextQuantity < 0) {
      return res.status(400).json({ message: "quantity must be a non-negative integer." });
    }

    const cart = await getCartForUser(req.user.id);
    const existingItem = cart.items.find((item) => item.productId.toString() === productId);

    if (!existingItem) {
      return res.status(404).json({ message: "Cart item not found." });
    }

    const product = await Product.findById(productId).lean();

    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (nextQuantity === 0) {
      cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
    } else if (nextQuantity > getAvailableQty(product)) {
      return res.status(400).json({ message: "Requested quantity exceeds available inventory." });
    } else {
      existingItem.quantity = nextQuantity;
    }

    await cart.save();

    res.json(await buildCartResponse(cart));
  })
);

router.delete(
  "/items/:productId",
  asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const cart = await getCartForUser(req.user.id);

    cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
    await cart.save();

    res.json(await buildCartResponse(cart));
  })
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const cart = await getCartForUser(req.user.id);
    cart.items = [];
    await cart.save();

    res.json(await buildCartResponse(cart));
  })
);

export default router;
