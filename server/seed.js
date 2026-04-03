import "dotenv/config";
import mongoose from "mongoose";
import connectToDatabase from "./db.js";
import Product from "./models/Product.js";
import sampleProducts from "./data/sampleProducts.js";

const seedDatabase = async () => {
  await connectToDatabase();

  const operations = sampleProducts.map((product) => ({
    updateOne: {
      filter: { name: product.name },
      update: { $set: product },
      upsert: true,
    },
  }));

  await Product.bulkWrite(operations);
  console.log(`Seeded ${operations.length} products.`);
};

seedDatabase()
  .catch((error) => {
    console.error("Failed to seed database.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
