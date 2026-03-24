// Generate a unique batch ID and sequence name ONCE before any workers start
if (!process.env.BATCH_ID) {
  process.env.BATCH_ID = `specmatic-studio-playwright-tests-${Date.now()}`;
}
if (!process.env.BATCH_SEQUENCE_NAME) {
  process.env.BATCH_SEQUENCE_NAME = `Run - ${new Date().toISOString()}`;
}
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config();
import path from "path";
import fs from "fs";
const studioRuntime = require("./utils/specmatic-studio-runtime");
const isCI = !!process.env.CI;
// Decide which env file to load
const envName = process.env.ENV_NAME || (isCI ? "ci" : "local");
const envFile = path.resolve(__dirname, `env/.env.${envName}`);

if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
  console.log(`[env] Loaded ${envFile}`);
} else {
  throw new Error(`❌ Could not load required CI env file: ${envFile}`);
}

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });
/**
 * See https://playwright.dev/docs/test-configuration.
 */

const isDocker = process.env.USE_DOCKER === "true";
const isWindows = process.platform === "win32";
const dockerScript = isWindows ? "start-docker.bat" : "./start-docker.sh";
const { isJarModeEnabled } = studioRuntime;
const isJarMode = isJarModeEnabled();

if (isJarMode) {
  if (isDocker) {
    console.log(
      "[specmatic] SPECMATIC_STUDIO_JAR_URL is set. Skipping Docker startup and using the jar instead.",
    );
  }
  process.env.BASE_URL = "http://127.0.0.1:9000/_specmatic/studio";
}

const baseURL =
  process.env.BASE_URL || "http://localhost:9000/_specmatic/studio";

export default defineConfig({
  testDir: "./",
  testMatch: ["tests/**/*.spec.ts", "specs/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 0,
  workers: 1,
  reporter: [
    ["html"],
    ["json", { outputFile: "playwright-report/test-results.json" }],
    ["junit", { outputFile: "playwright-report/junit-report.xml" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "on",
    video: "on",
    launchOptions: {
      headless: process.env.CI ? true : process.env.HEADLESS === "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: process.env.CI ? { width: 1920, height: 1440 } : null,
        launchOptions: {
          headless: process.env.CI ? true : process.env.HEADLESS === "true",
          args: ["--start-maximized"],
        },
      },
    },
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
    // {
    //   name: "Google Chrome",
    //   use: { ...devices["Desktop Chrome"], channel: "chrome" },
    // },
  ],
  globalSetup: path.resolve(__dirname, "./utils/global-setup.ts"),
  globalTeardown: path.resolve(__dirname, "./utils/global-teardown.ts"),
  ...(!isJarMode && isDocker
    ? {
        webServer: {
          command: dockerScript,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
        },
      }
    : {}),
});
