import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
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

const baseURL =
  process.env.BASE_URL || "http://localhost:9000/_specmatic/studio";

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
interface BaseConfigType {
  testDir: string;
  fullyParallel: boolean;
  forbidOnly: boolean;
  retries: number;
  workers: number | undefined;
  reporter: string;
  use: any;
  projects: any[];
  globalTeardown: string;
  webServer?: {
    command: string;
    url: string;
    reuseExistingServer: boolean;
  };
}

const baseConfig: BaseConfigType = {
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "on" as const,
    video: "on" as const,
    launchOptions: {
      headless: process.env.HEADLESS !== "false",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
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
  globalTeardown: require.resolve("./utils/teardown.js"),
};

if (process.env.USE_DOCKER === "true") {
  const isWindows = process.platform === "win32";
  const dockerScript = isWindows ? "start-docker.bat" : "./start-docker.sh";
  baseConfig.webServer = {
    command: dockerScript,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  };
}

export default defineConfig(baseConfig);
