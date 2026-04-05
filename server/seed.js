import "dotenv/config";
import mongoose from "mongoose";
import connectToDatabase from "./db.js";
import User from "./models/User.js";
import Product from "./models/Product.js";
import sampleProducts from "./data/sampleProducts.js";
import { buildLoadTestProduct, DEFAULT_LOAD_TEST_PRODUCT_SKU } from "./data/loadTestProduct.js";
import { hashPassword } from "./utils/passwords.js";

const seedDatabase = async () => {
  await connectToDatabase();

  const shouldSeedLoadTestProduct = process.env.SEED_LOAD_TEST_PRODUCT === "true";
  const loadTestProductSku =
    (process.env.LOAD_TEST_PRODUCT_SKU || DEFAULT_LOAD_TEST_PRODUCT_SKU).trim().toUpperCase();
  const productsToSeed = shouldSeedLoadTestProduct
    ? [...sampleProducts, buildLoadTestProduct({ sku: loadTestProductSku })]
    : sampleProducts;

  const operations = productsToSeed.map((product) => ({
    updateOne: {
      filter: product.sku
        ? {
            $or: [{ sku: product.sku }, { name: product.name, category: product.category }],
          }
        : { name: product.name, category: product.category },
      update: { $set: product },
      upsert: true,
    },
  }));

  await Product.bulkWrite(operations);

  const bootstrapUsers = [
    {
      email: process.env.SEED_SUPER_ADMIN_EMAIL,
      password: process.env.SEED_SUPER_ADMIN_PASSWORD,
      displayName: process.env.SEED_SUPER_ADMIN_NAME || "Super Admin",
      role: "super_admin",
    },
    {
      email: process.env.SEED_MANAGER_EMAIL,
      password: process.env.SEED_MANAGER_PASSWORD,
      displayName: process.env.SEED_MANAGER_NAME || "Product Manager",
      role: "product_manager",
    },
  ].filter((user) => user.email && user.password);

  for (const user of bootstrapUsers) {
    await User.findOneAndUpdate(
      { email: user.email.toLowerCase() },
      {
        $set: {
          email: user.email.toLowerCase(),
          displayName: user.displayName,
          role: user.role,
          passwordHash: await hashPassword(user.password),
          isActive: true,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log(
    `Seeded ${operations.length} products and ${bootstrapUsers.length} privileged users.`
  );

  if (shouldSeedLoadTestProduct) {
    console.log(`Staging load-test product ready with SKU ${loadTestProductSku}.`);
  }
};

seedDatabase()
  .catch((error) => {
    console.error("Failed to seed database.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
