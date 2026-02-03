import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import http from "http";
import { execSync } from "child_process";

const isCI = !!process.env.CI;
// Decide which env file to load
const envName = process.env.ENV_NAME || (isCI ? "ci" : "local");
const envFile = path.resolve(__dirname, `env/.env.${envName}`);

// Load if available (in CI, .env.ci should exist because it's checked in)
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
  console.log(`[env] Loaded ${envFile}`);
} else {
  // In CI, you probably *do* want to fail if .env.ci is missing
  if (isCI) {
    throw new Error(`❌ Could not load required CI env file: ${envFile}`);
  }
  console.log(`[env] Not found: ${envFile}. Using process.env values.`);
}

const baseURL =
  process.env.BASE_URL || "http://localhost:9000/_specmatic/studio";

// Utility to check if baseURL is accessible
function checkBaseURLAccessible(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const req = http.get(url, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

(async () => {
  const accessible = await checkBaseURLAccessible(baseURL);
  if (!accessible && ["local", "ci"].includes(envName)) {
    console.log(
      `[startup] baseURL ${baseURL} not accessible. Starting docker...`,
    );
    try {
      execSync("./start-docker.sh", { stdio: "inherit" });
    } catch (e) {
      console.error("[startup] Failed to start docker:", e);
    }
  }
})();

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
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "on",
    video: "on",
    launchOptions: {
      headless: process.env.HEADLESS !== "false",
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against branded browsers. */
    {
      name: "Google Chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },

  globalTeardown: require.resolve("./utils/teardown.js"),
});
