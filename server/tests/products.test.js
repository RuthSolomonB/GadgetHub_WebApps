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
        sku: "GH-TEST-ATLAS-AIR",
        price: 999,
        stockQty: 8,
        image: "/atlas-air.png",
      },
      {
        name: "Pulse Audio Core",
        description: "Portable speaker",
        category: "Audio",
        sku: "GH-TEST-PULSE-CORE",
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

  it("supports exact sku filtering for staging load-test targeting", async () => {
    await Product.create([
      {
        name: "Atlas Laptop Air",
        description: "Portable performance machine",
        category: "Computers",
        sku: "GH-TARGET-SKU",
        price: 999,
        stockQty: 8,
        image: "/atlas-air.png",
      },
      {
        name: "Pulse Audio Core",
        description: "Portable speaker",
        category: "Audio",
        sku: "GH-OTHER-SKU",
        price: 199,
        stockQty: 14,
        image: "/pulse-core.png",
      },
    ]);

    const response = await request(app).get("/api/products").query({
      sku: "gh-target-sku",
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].sku).toBe("GH-TARGET-SKU");
  });

  it("supports filtering to active flash-sale products only", async () => {
    const now = Date.now();

    await Product.create([
      {
        name: "Atlas Laptop Air",
        description: "Portable performance machine",
        category: "Computers",
        sku: "GH-FLASH-SALE-ATLAS",
        price: 999,
        stockQty: 8,
        image: "/atlas-air.png",
        flashSale: {
          enabled: true,
          salePrice: 799,
          discountPercent: 20,
          startsAt: new Date(now - 1000 * 60),
          endsAt: new Date(now + 1000 * 60 * 60),
          saleStockQty: 4,
        },
      },
      {
        name: "Pulse Audio Core",
        description: "Portable speaker",
        category: "Audio",
        sku: "GH-FLASH-SALE-PULSE",
        price: 199,
        stockQty: 14,
        image: "/pulse-core.png",
        flashSale: {
          enabled: true,
          salePrice: 149,
          discountPercent: 25,
          startsAt: new Date(now + 1000 * 60),
          endsAt: new Date(now + 1000 * 60 * 60),
          saleStockQty: 3,
        },
      },
    ]);

    const response = await request(app).get("/api/products").query({
      hasFlashSale: "true",
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].name).toBe("Atlas Laptop Air");
    expect(response.body.items[0].hasActiveFlashSale).toBe(true);
  });

  it("supports ending-soon sorting for active flash-sale products", async () => {
    const now = Date.now();

    await Product.create([
      {
        name: "Nova Phone Prime",
        description: "Flagship phone",
        category: "Phones",
        sku: "GH-ENDING-SOON-NOVA",
        price: 899,
        stockQty: 12,
        image: "/nova-prime.png",
        flashSale: {
          enabled: true,
          salePrice: 749,
          discountPercent: 16.69,
          startsAt: new Date(now - 1000 * 60 * 60),
          endsAt: new Date(now + 1000 * 60 * 30),
          saleStockQty: 5,
        },
      },
      {
        name: "Atlas Laptop Air",
        description: "Portable performance machine",
        category: "Computers",
        sku: "GH-ENDING-SOON-ATLAS",
        price: 999,
        stockQty: 8,
        image: "/atlas-air.png",
        flashSale: {
          enabled: true,
          salePrice: 799,
          discountPercent: 20,
          startsAt: new Date(now - 1000 * 60 * 60),
          endsAt: new Date(now + 1000 * 60 * 90),
          saleStockQty: 4,
        },
      },
      {
        name: "Pulse Audio Core",
        description: "Portable speaker",
        category: "Audio",
        sku: "GH-ENDING-SOON-PULSE",
        price: 199,
        stockQty: 14,
        image: "/pulse-core.png",
      },
    ]);

    const response = await request(app).get("/api/products").query({
      sort: "ending_soon",
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items.map((product) => product.name)).toEqual([
      "Nova Phone Prime",
      "Atlas Laptop Air",
    ]);
    expect(response.body.items.every((product) => product.hasActiveFlashSale)).toBe(true);
  });

  it("sorts storefront price order using the active flash-sale price", async () => {
    const now = Date.now();

    await Product.create([
      {
        name: "Atlas Laptop Air",
        description: "Portable performance machine",
        category: "Computers",
        sku: "GH-PRICE-SORT-ATLAS",
        price: 1000,
        stockQty: 8,
        image: "/atlas-air.png",
        flashSale: {
          enabled: true,
          salePrice: 120,
          discountPercent: 88,
          startsAt: new Date(now - 1000 * 60 * 60),
          endsAt: new Date(now + 1000 * 60 * 60),
          saleStockQty: 4,
        },
      },
      {
        name: "Nova Phone Prime",
        description: "Flagship phone",
        category: "Phones",
        sku: "GH-PRICE-SORT-NOVA",
        price: 200,
        stockQty: 12,
        image: "/nova-prime.png",
      },
      {
        name: "Pulse Audio Core",
        description: "Portable speaker",
        category: "Audio",
        sku: "GH-PRICE-SORT-PULSE",
        price: 150,
        stockQty: 10,
        image: "/pulse-core.png",
        flashSale: {
          enabled: true,
          salePrice: 75,
          discountPercent: 50,
          startsAt: new Date(now + 1000 * 60 * 60),
          endsAt: new Date(now + 1000 * 60 * 120),
          saleStockQty: 3,
        },
      },
    ]);

    const response = await request(app).get("/api/products").query({
      sort: "price_asc",
      limit: 24,
    });

    expect(response.status).toBe(200);
    expect(response.body.items.map((product) => product.name)).toEqual([
      "Atlas Laptop Air",
      "Pulse Audio Core",
      "Nova Phone Prime",
    ]);
    expect(response.body.items[0].effectivePrice).toBe(120);
    expect(response.body.items[1].effectivePrice).toBe(150);
  });

  it("filters storefront min and max price using the active flash-sale price", async () => {
    const now = Date.now();

    await Product.create([
      {
        name: "Atlas Laptop Air",
        description: "Portable performance machine",
        category: "Computers",
        sku: "GH-PRICE-FILTER-ATLAS",
        price: 1000,
        stockQty: 8,
        image: "/atlas-air.png",
        flashSale: {
          enabled: true,
          salePrice: 699,
          discountPercent: 30.1,
          startsAt: new Date(now - 1000 * 60 * 60),
          endsAt: new Date(now + 1000 * 60 * 60),
          saleStockQty: 4,
        },
      },
      {
        name: "Nova Phone Prime",
        description: "Flagship phone",
        category: "Phones",
        sku: "GH-PRICE-FILTER-NOVA",
        price: 750,
        stockQty: 12,
        image: "/nova-prime.png",
      },
      {
        name: "Pulse Audio Core",
        description: "Portable speaker",
        category: "Audio",
        sku: "GH-PRICE-FILTER-PULSE",
        price: 650,
        stockQty: 10,
        image: "/pulse-core.png",
      },
    ]);

    const response = await request(app).get("/api/products").query({
      minPrice: 680,
      maxPrice: 720,
      limit: 24,
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].name).toBe("Atlas Laptop Air");
    expect(response.body.items[0].effectivePrice).toBe(699);
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
