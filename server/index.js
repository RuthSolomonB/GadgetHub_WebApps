import "dotenv/config";
import createApp from "./app.js";
import connectToDatabase from "./db.js";
const app = createApp();
const port = Number(process.env.PORT) || 5000;

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
