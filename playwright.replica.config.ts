import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find(existsSync);
export default defineConfig({
  testDir: "./tests/replica",
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3016",
    viewport: { width: 1500, height: 1000 },
    launchOptions: { executablePath: chrome },
  },
  webServer: {
    command: "node --import tsx src/app/server.ts --dev",
    url: "http://127.0.0.1:3016",
    env: { PORT: "3016" },
    reuseExistingServer: false,
  },
});
