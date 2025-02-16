import { defineConfig } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Définir __dirname dans un module ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "certs/key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "certs/cert.pem")),
    },
    host: "localhost",
  },
});