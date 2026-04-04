/* @vitest-environment node */
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { buildTestApp, clearDatabase, connectTestDatabase, disconnectTestDatabase } from "./testServer.js";
import { hashPassword } from "../utils/passwords.js";
import { signToken } from "../utils/tokens.js";

const createCustomer = async () => {
  const customer = await User.create({
    email: "customer@example.com",
    displayName: "Customer",
    passwordHash: await hashPassword("Password123!"),
    role: "customer",
  });

  return { customer, token: signToken(customer) };
};

describe("checkout flow", () => {
  const app = buildTestApp();

  beforeAll(connectTestDatabase);
  afterEach(clearDatabase);
  afterAll(disconnectTestDatabase);

  it("creates an order and decrements flash sale stock without overselling", async () => {
    const { token } = await createCustomer();
    const product = await Product.create({
      name: "Vector Console Ultra",
      description: "Flash sale product",
      category: "Gaming",
      price: 499,
      stockQty: 10,
      image: "/console-ultra.png",
      flashSale: {
        enabled: true,
        salePrice: 429,
        startsAt: new Date(Date.now() - 1000 * 60).toISOString(),
        endsAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
        saleStockQty: 2,
      },
    });

    const addToCart = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product._id.toString(), quantity: 2 });

    expect(addToCart.status).toBe(201);

    const checkoutResponse = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutResponse.body.order.items[0].unitPriceSnapshot).toBe(429);
    expect(checkoutResponse.body.order.items[0].usedFlashSale).toBe(true);

    const updatedProduct = await Product.findById(product._id).lean();
    expect(updatedProduct.flashSale.saleStockQty).toBe(0);
    expect(updatedProduct.stockQty).toBe(10);

    const secondCheckout = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product._id.toString(), quantity: 11 });

    expect(secondCheckout.status).toBe(400);
    expect(secondCheckout.body.message).toMatch(/exceeds available inventory/i);
  });
});
