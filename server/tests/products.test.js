/* @vitest-environment node */
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { buildTestApp, clearDatabase, connectTestDatabase, disconnectTestDatabase } from "./testServer.js";
import { hashPassword } from "../utils/passwords.js";
import { signToken } from "../utils/tokens.js";

const createManager = async () => {
  const manager = await User.create({
    email: "manager@example.com",
    displayName: "Manager",
    passwordHash: await hashPassword("Password123!"),
    role: "product_manager",
  });

  return { manager, token: signToken(manager) };
};

const createCustomer = async () => {
  const customer = await User.create({
    email: "customer@example.com",
    displayName: "Customer",
    passwordHash: await hashPassword("Password123!"),
    role: "customer",
  });

  return customer;
};

describe("product routes", () => {
  const app = buildTestApp();

  beforeAll(connectTestDatabase);
  afterEach(clearDatabase);
  afterAll(disconnectTestDatabase);

  it("supports search and category filtering", async () => {
    await Product.create([
      {
        name: "Atlas Laptop Air",
        description: "Portable performance machine",
        category: "Computers",
        price: 999,
        stockQty: 8,
        image: "/atlas-air.png",
      },
      {
        name: "Pulse Audio Core",
        description: "Portable speaker",
        category: "Audio",
        price: 199,
        stockQty: 14,
        image: "/pulse-core.png",
      },
    ]);

    const response = await request(app).get("/api/products").query({
      category: "Computers",
      search: "laptop",
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].name).toContain("Atlas Laptop");
    expect(response.body.meta.categories).toContain("Audio");
  });

  it("allows product managers to create products and blocks guests", async () => {
    const { token } = await createManager();
    const payload = {
      name: "Nova Phone Prime",
      description: "Flagship device",
      category: "Phones",
      price: 899,
      stockQty: 11,
      image: "https://example.com/nova.png",
      flashSale: {
        enabled: true,
        salePrice: 799,
        saleStockQty: 4,
        startsAt: new Date(Date.now() - 1000 * 60).toISOString(),
        endsAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      },
    };

    const guestResponse = await request(app).post("/api/products").send(payload);
    expect(guestResponse.status).toBe(401);

    const managerResponse = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(managerResponse.status).toBe(201);
    expect(managerResponse.body.name).toBe(payload.name);
    expect(managerResponse.body.hasActiveFlashSale).toBe(true);
  });

  it("supports admin inventory status filters and includes inactive categories", async () => {
    const { token } = await createManager();

    await Product.create([
      {
        name: "Atlas Laptop Air",
        description: "Portable performance machine",
        category: "Computers",
        price: 999,
        stockQty: 8,
        image: "/atlas-air.png",
      },
      {
        name: "Vault Camera Mini",
        description: "Compact inactive camera",
        category: "Cameras",
        price: 399,
        stockQty: 2,
        image: "/vault-camera.png",
        isActive: false,
      },
    ]);

    const response = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .query({
        includeInactive: "true",
        status: "inactive",
        limit: 50,
      });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].name).toBe("Vault Camera Mini");
    expect(response.body.meta.categories).toContain("Cameras");
  });

  it("allows managers to delete products and removes them from carts", async () => {
    const { token } = await createManager();
    const customer = await createCustomer();
    const product = await Product.create({
      name: "Atlas Laptop Air",
      description: "Portable performance machine",
      category: "Computers",
      price: 999,
      stockQty: 8,
      image: "/atlas-air.png",
    });

    await Cart.create({
      userId: customer._id,
      items: [{ productId: product._id, quantity: 2 }],
    });

    const response = await request(app)
      .delete(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(await Product.findById(product.id)).toBeNull();

    const cart = await Cart.findOne({ userId: customer._id }).lean();
    expect(cart.items).toHaveLength(0);
  });
});
