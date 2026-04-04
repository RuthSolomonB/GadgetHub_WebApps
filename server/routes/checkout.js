import express from "express";
import mongoose from "mongoose";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import { decrementInventoryForLine } from "../services/inventoryService.js";

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireRoles("customer"),
  asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();

    try {
      let orderDocument;

      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ userId: req.user.id }).session(session);

        if (!cart || cart.items.length === 0) {
          throw new Error("Your cart is empty.");
        }

        const orderItems = [];

        for (const item of cart.items) {
          const checkoutLine = await decrementInventoryForLine(item.productId, item.quantity, session);
          orderItems.push(checkoutLine.orderLine);
        }

        const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

        orderDocument = await Order.create(
          [
            {
              userId: req.user.id,
              items: orderItems,
              subtotal,
              total: subtotal,
              status: "placed",
              placedAt: new Date(),
            },
          ],
          { session }
        );

        cart.items = [];
        await cart.save({ session });
      });

      res.status(201).json({
        order: orderDocument[0],
        message: "Checkout completed successfully.",
      });
    } finally {
      await session.endSession();
    }
  })
);

export default router;
