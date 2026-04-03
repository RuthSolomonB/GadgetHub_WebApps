import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id." });
    }

    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Add this new POST route
router.post("/", async (req, res, next) => {
  try {
    const { name, price, stock, imageUrl } = req.body;

    // Basic validation for your graduation project
    if (!name || !price || !imageUrl) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const newProduct = new Product({
      name,
      price: Number(price),
      stock: Number(stock) || 0,
      imageUrl
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    next(error);
  }
});

export default router;
