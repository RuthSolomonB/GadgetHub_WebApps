import Product from "../models/Product.js";
import { getActiveFlashSale, serializeProduct } from "./productService.js";

export const buildOrderLineSnapshot = (product, quantity) => {
  const activeFlashSale = getActiveFlashSale(product);
  const unitPrice = activeFlashSale ? activeFlashSale.salePrice : product.price;

  return {
    productId: product._id,
    nameSnapshot: product.name,
    imageSnapshot: product.image,
    unitPriceSnapshot: unitPrice,
    quantity,
    lineTotal: unitPrice * quantity,
    usedFlashSale: Boolean(activeFlashSale),
  };
};

export const decrementInventoryForLine = async (productId, quantity, session) => {
  const product = await Product.findById(productId).session(session);

  if (!product || !product.isActive) {
    throw new Error("A cart item is no longer available.");
  }

  const activeFlashSale = getActiveFlashSale(product);
  const stockPath = activeFlashSale ? "flashSale.saleStockQty" : "stockQty";
  const updatedProduct = await Product.findOneAndUpdate(
    {
      _id: productId,
      isActive: true,
      [stockPath]: { $gte: quantity },
    },
    {
      $inc: { [stockPath]: -quantity },
    },
    {
      new: true,
      session,
    }
  );

  if (!updatedProduct) {
    throw new Error(`Insufficient inventory for ${product.name}.`);
  }

  return {
    product,
    updatedProduct: serializeProduct(updatedProduct),
    orderLine: buildOrderLineSnapshot(product, quantity),
  };
};
