// Read ENABLE_VISUAL from environment (set by playwright.config.ts loading the correct .env file)
let ENABLE_VISUAL = process.env.ENABLE_VISUAL === "true";
const ENV_NAME = process.env.ENV_NAME;
const BRANCH_NAME = process.env.BRANCH_NAME;
const OS_TYPE = process.env.OS_TYPE;
const LOGGED_IN_USER = process.env.LOGGED_IN_USER;
const MACHINE_NAME = process.env.MACHINE_NAME;
if (ENV_NAME === "ci" && BRANCH_NAME && BRANCH_NAME !== "main") {
  ENABLE_VISUAL = false;
}
export { ENABLE_VISUAL };

export { expect } from "@playwright/test";

import { test as base } from "@playwright/test";
import path from "path";
import fs from "fs";
import {
  Eyes,
  Configuration,
  FileLogHandler,
} from "@applitools/eyes-playwright";
import { Batch, Runner } from "./global-setup";
import { captureBrowserConsole } from "./browser-console-logger";

export const test = base.extend<{ eyes: Eyes }>({
  eyes: async ({ page }, use, testInfo) => {
    // 🔹 Start capturing console + network failures
    const consoleCapture = captureBrowserConsole(page, testInfo);

    if (ENABLE_VISUAL && testInfo.timeout < 120000) {
      // Increase timeout to 2 minutes for visual tests
      testInfo.setTimeout(120000);
    }

    // Configure Applitools log file location per test
    const logDir = path.resolve(
      process.cwd(),
      "playwright-report",
      "applitools-logs",
    );
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    // Use a random string for uniqueness
    function randomString(length = 8) {
      return Math.random().toString(36).substr(2, length);
    }
    const logFile = path.join(
      logDir,
      `applitools_log_${randomString()}${testInfo.retry ? `-retry${testInfo.retry}` : ""}.log`,
    );

    const eyes = new Eyes(Runner);
    eyes.setLogHandler(new FileLogHandler(true, logFile)); // true = verbose

    const config = new Configuration();

    config.setBatch(Batch);
    config.setAppName("Specmatic Studio");
    config.setForceFullPageScreenshot(true);
    config.setIsDisabled(!ENABLE_VISUAL);
    config.setIgnoreDisplacements(true);
    config.setBranchName(BRANCH_NAME || "unknown");
    config.setEnvironmentName(ENV_NAME || "local");

    if (process.env.APPLITOOLS_API_KEY) {
      config.setApiKey(process.env.APPLITOOLS_API_KEY);
    }

    config.addBrowsers(
      { name: "chrome", width: 1920, height: 1200 },
      // { name: "safari", width: 1920, height: 1200 },
      // { name: "edge", width: 1920, height: 1200 },
    );

    config.setTestName(testInfo.title);

    config.addProperty("environment", ENV_NAME || "local");
    config.addProperty("branch", BRANCH_NAME || "unknown");
    config.addProperty("os", OS_TYPE || "unknown");
    config.addProperty("user", LOGGED_IN_USER || "unknown");
    config.addProperty("machine", MACHINE_NAME || "unknown");

    eyes.setConfiguration(config);

    await eyes.open(page);

    try {
      await use(eyes);

      const results = await eyes.close(false);
      console.log(`Test '${testInfo.title}' - Eyes results:`, results);
    } catch (error) {
      console.error("Error closing Eyes:", error);
      await eyes.abortIfNotClosed();
      throw error; // optional: keep failure behavior consistent
    } finally {
      // ✅ Always attach console logs to Playwright report
      await consoleCapture.attach();
      // Attach Applitools log file to Playwright report
      if (fs.existsSync(logFile)) {
        await testInfo.attach("applitools-log", {
          path: logFile,
          contentType: "text/plain",
        });
      }
    }
  },
});
