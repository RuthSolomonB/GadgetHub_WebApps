import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import connectToDatabase from "./db.js";
import productsRouter from "./routes/products.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distPath = path.join(projectRoot, "dist");
const indexFilePath = path.join(distPath, "index.html");
const hasFrontendBuild = fs.existsSync(indexFilePath);

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/products", productsRouter);

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
  console.error(error);
  res.status(500).json({ message: "Internal server error." });
});

const startServer = async () => {
  await connectToDatabase();

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server.", error);
  process.exit(1);
});
