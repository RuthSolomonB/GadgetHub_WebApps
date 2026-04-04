import mongoose from "mongoose";

const flashSaleSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: null,
    },
    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    saleStockQty: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stockQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    image: {
      type: String,
      default: "/vite.svg",
      trim: true,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    flashSale: {
      type: flashSaleSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: "text", description: "text" });
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
