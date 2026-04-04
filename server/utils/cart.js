import Product from "../models/Product.js";
import { getActiveFlashSale } from "../services/productService.js";

export const buildCartResponse = async (cart) => {
  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productById = new Map(products.map((product) => [product._id.toString(), product]));

  const items = cart.items
    .map((item) => {
      const product = productById.get(item.productId.toString());

      if (!product || !product.isActive) {
        return null;
      }

      const flashSale = getActiveFlashSale(product);
      const unitPrice = flashSale ? flashSale.salePrice : product.price;

      return {
        productId: product._id.toString(),
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
        product: {
          id: product._id.toString(),
          name: product.name,
          image: product.image,
          category: product.category,
          stockQty: product.stockQty,
          hasActiveFlashSale: Boolean(flashSale),
        },
      };
    })
    .filter(Boolean);

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    id: cart._id.toString(),
    items,
    subtotal,
    total: subtotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
};
