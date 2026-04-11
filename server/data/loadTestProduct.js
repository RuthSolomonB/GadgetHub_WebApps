export const DEFAULT_LOAD_TEST_PRODUCT_SKU = "GH-LOAD-FLASH-SALE";
export const DEFAULT_LOAD_TEST_USER_PREFIX = "load-test-user";
export const DEFAULT_LOAD_TEST_USER_PASSWORD = "ChangeMe123!";

export const buildLoadTestProduct = ({
  sku = DEFAULT_LOAD_TEST_PRODUCT_SKU,
  stockQty = 5000,
} = {}) => ({
  name: "GadgetHub Flash Sale Load Test Device",
  description: "Dedicated staging-only product for flash-sale checkout load testing.",
  category: "Load Testing",
  sku,
  price: 199,
  stockQty,
  image: "https://placehold.co/600x600/0f172a/f8fafc?text=GadgetHub+Load+Test",
  isActive: true,
  flashSale: {
    enabled: true,
    salePrice: 149,
    discountPercent: null,
    startsAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    saleStockQty: stockQty,
  },
});
