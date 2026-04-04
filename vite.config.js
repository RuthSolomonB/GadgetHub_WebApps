import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // "/api": "http://localhost:5000",
      "/api": "https://3jz9bj8avk.us-west-2.awsapprunner.com/api",
    },
  },
});
