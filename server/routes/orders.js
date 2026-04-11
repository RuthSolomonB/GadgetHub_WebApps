import express from "express";
import mongoose from "mongoose";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.use(requireAuth, requireRoles("customer"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ userId: req.user.id }).sort({ placedAt: -1 }).lean();
    res.json({ items: orders });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id." });
    }

    const order = await Order.findOne({ _id: id, userId: req.user.id }).lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.json(order);
  })
);

export default router;
