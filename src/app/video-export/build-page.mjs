import { build } from "vite";

// Build in a separate process so production mode never affects the live dev server.
await build({
  logLevel: "error",
  build: { outDir: process.argv[2], copyPublicDir: false },
});
