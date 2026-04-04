/* @vitest-environment node */
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { buildTestApp, clearDatabase, connectTestDatabase, disconnectTestDatabase } from "./testServer.js";
import { hashPassword } from "../utils/passwords.js";
import { signToken } from "../utils/tokens.js";

const createUserWithRole = async (role) => {
  const user = await User.create({
    email: `${role}@example.com`,
    displayName: `${role} user`,
    passwordHash: await hashPassword("Password123!"),
    role,
  });

  return { user, token: signToken(user) };
};

describe("admin routes", () => {
  const app = buildTestApp();

  beforeAll(connectTestDatabase);
  afterEach(clearDatabase);
  afterAll(disconnectTestDatabase);

  it("applies a percentage flash sale to targeted active products only", async () => {
    const { token } = await createUserWithRole("product_manager");
    const [selectedProduct, secondSelectedProduct, inactiveProduct] = await Product.create([
      {
        name: "Atlas Laptop Air",
        description: "Portable performance machine",
        category: "Computers",
        price: 1000,
        stockQty: 8,
        image: "/atlas-air.png",
      },
      {
        name: "Nova Phone Prime",
        description: "Flagship device",
        category: "Phones",
        price: 800,
        stockQty: 11,
        image: "/nova-phone.png",
      },
      {
        name: "Dormant Laptop",
        description: "Inactive inventory",
        category: "Computers",
        price: 900,
        stockQty: 3,
        image: "/dormant-laptop.png",
        isActive: false,
      },
    ]);

    const response = await request(app)
      .patch("/api/admin/flash-sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action: "apply",
        productIds: [selectedProduct.id, secondSelectedProduct.id, inactiveProduct.id],
        flashSale: {
          discountPercent: 20,
          saleStockQty: 5,
          startsAt: new Date(Date.now() - 60_000).toISOString(),
          endsAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.matchedCount).toBe(2);

    const refreshedProducts = await Product.find().sort({ name: 1 }).lean();
    const refreshedByName = Object.fromEntries(refreshedProducts.map((product) => [product.name, product]));

    expect(refreshedByName["Atlas Laptop Air"].flashSale.discountPercent).toBe(20);
    expect(refreshedByName["Atlas Laptop Air"].flashSale.salePrice).toBe(800);
    expect(refreshedByName["Nova Phone Prime"].flashSale.salePrice).toBe(640);
    expect(refreshedByName["Dormant Laptop"].flashSale.enabled).toBe(false);
  });

  it("clears flash-sale state for targeted active products", async () => {
    const { token } = await createUserWithRole("product_manager");
    const [product] = await Product.create([
      {
        name: "Atlas Laptop Air",
        description: "Portable performance machine",
        category: "Computers",
        price: 999,
        stockQty: 8,
        image: "/atlas-air.png",
        flashSale: {
          enabled: true,
          salePrice: 749,
          discountPercent: 25,
          saleStockQty: 5,
          startsAt: new Date(Date.now() - 60_000),
          endsAt: new Date(Date.now() + 60 * 60_000),
        },
      },
    ]);

    const response = await request(app)
      .patch("/api/admin/flash-sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action: "clear",
        productIds: [product.id],
      });

    expect(response.status).toBe(200);
    expect(response.body.updatedCount).toBe(1);

    const refreshedProduct = await Product.findById(product.id).lean();
    expect(refreshedProduct.flashSale.enabled).toBe(false);
    expect(refreshedProduct.flashSale.salePrice).toBeNull();
    expect(refreshedProduct.flashSale.discountPercent).toBeNull();
    expect(refreshedProduct.flashSale.saleStockQty).toBe(0);
  });

  it("deletes product-manager accounts for super admins", async () => {
    const { token } = await createUserWithRole("super_admin");
    const manager = await User.create({
      email: "manager@example.com",
      displayName: "Manager User",
      passwordHash: await hashPassword("Password123!"),
      role: "product_manager",
    });

    const response = await request(app)
      .delete(`/api/admin/product-managers/${manager.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.deletedId).toBe(manager.id);
    expect(await User.findById(manager.id)).toBeNull();
  });

  it("blocks customers from mutating flash sales", async () => {
    const { token } = await createUserWithRole("customer");

    const response = await request(app)
      .patch("/api/admin/flash-sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action: "clear",
        productIds: ["67f00a3a0f9c4f7b10f01c20"],
      });

    expect(response.status).toBe(403);
  });
});
