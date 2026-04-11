/* @vitest-environment node */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import createApp from "../app.js";

let replSet;

export const connectTestDatabase = async () => {
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.APP_ORIGIN = "http://localhost:5173";

  replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ ip: "127.0.0.1" }],
    replSet: { count: 1 },
  });

  await mongoose.connect(replSet.getUri(), {
    dbName: "gadgethub-test",
  });
};

export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;

  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
};

export const disconnectTestDatabase = async () => {
  await mongoose.disconnect();

  if (replSet) {
    await replSet.stop();
  }
};

export const buildTestApp = () => createApp();
