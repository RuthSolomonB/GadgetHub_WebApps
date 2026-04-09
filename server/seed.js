import "dotenv/config";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import connectToDatabase from "./db.js";
import User from "./models/User.js";
import Product from "./models/Product.js";
import sampleProducts from "./data/sampleProducts.js";
import { buildLoadTestProduct, DEFAULT_LOAD_TEST_PRODUCT_SKU } from "./data/loadTestProduct.js";
import { hasS3UploadConfig, uploadBufferToS3 } from "./upload.js";
import { hashPassword } from "./utils/passwords.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const seedImageSourceDir = path.join(projectRoot, "personal_files", "seed images");

const buildSeedImageFilename = (imageNumber) =>
  `product_${String(imageNumber).padStart(2, "0")}.png`;

const getImageContentType = (fileName) => {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "application/octet-stream";
};

const uploadSeedImages = async (products) => {
  if (!hasS3UploadConfig) {
    throw new Error(
      "S3 uploads are required for seeding product images. Set AWS_REGION and S3_BUCKET_NAME, then retry."
    );
  }

  let sourceEntries;

  try {
    sourceEntries = new Set(await fs.readdir(seedImageSourceDir));
  } catch (error) {
    throw new Error(
      `Seed image source directory is unavailable at ${seedImageSourceDir}: ${error.message}`
    );
  }

  const imageFilenames = Array.from({ length: products.length }, (_value, index) =>
    buildSeedImageFilename(index + 1)
  );
  const missingImages = imageFilenames.filter((fileName) => !sourceEntries.has(fileName));

  if (missingImages.length > 0) {
    throw new Error(
      `Missing ${missingImages.length} seed image(s) in ${seedImageSourceDir}: ${missingImages.join(", ")}`
    );
  }

  const productsWithUploadedImages = await Promise.all(
    products.map(async (product, index) => {
      const imageFilename = imageFilenames[index];
      const imagePath = path.join(seedImageSourceDir, imageFilename);
      const imageBuffer = await fs.readFile(imagePath);
      const imageExtension = path.extname(imageFilename).toLowerCase();
      const objectKey = `products/seeds/${product.sku.toLowerCase()}${imageExtension}`;
      const imageUrl = await uploadBufferToS3({
        key: objectKey,
        body: imageBuffer,
        contentType: getImageContentType(imageFilename),
        cacheControl: "public, max-age=31536000, immutable",
      });

      return {
        ...product,
        image: imageUrl,
      };
    })
  );

  console.log(`Uploaded ${productsWithUploadedImages.length} seed images to S3.`);
  return productsWithUploadedImages;
};

const seedDatabase = async () => {
  const seededProducts = await uploadSeedImages(sampleProducts);
  await connectToDatabase();

  const shouldSeedLoadTestProduct = process.env.SEED_LOAD_TEST_PRODUCT === "true";
  const loadTestProductSku =
    (process.env.LOAD_TEST_PRODUCT_SKU || DEFAULT_LOAD_TEST_PRODUCT_SKU).trim().toUpperCase();
  const productsToSeed = shouldSeedLoadTestProduct
    ? [...seededProducts, buildLoadTestProduct({ sku: loadTestProductSku })]
    : seededProducts;

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
