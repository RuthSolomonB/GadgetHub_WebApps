import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import cartRouter from "./routes/cart.js";
import checkoutRouter from "./routes/checkout.js";
import ordersRouter from "./routes/orders.js";
import productsRouter from "./routes/products.js";
import uploadRouter from "./routes/upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distPath = path.join(projectRoot, "dist");
const indexFilePath = path.join(distPath, "index.html");
const hasFrontendBuild = fs.existsSync(indexFilePath);

const createCorsConfig = () => {
  const allowedOrigins = [
    process.env.APP_ORIGIN,
    process.env.AMPLIFY_APP_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ].filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS."));
    },
  };
};

export const createApp = () => {
  const app = express();

  app.use(cors(createCorsConfig()));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/checkout", checkoutRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/admin", adminRouter);

  if (hasFrontendBuild) {
    app.use(express.static(distPath));

    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(indexFilePath);
    });
  } else {
    app.get("/", (_req, res) => {
      res.status(200).send("Frontend build not found. Run npm run build.");
    });
  }

  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found." });
  });

  app.use((error, _req, res, _next) => {
    if (error?.message === "Origin not allowed by CORS.") {
      res.status(403).json({ message: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ message: error.message || "Internal server error." });
  });

  return app;
};

export default createApp;
