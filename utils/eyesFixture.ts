// Read ENABLE_VISUAL from environment (set by playwright.config.ts loading the correct .env file)
export const ENABLE_VISUAL = process.env.ENABLE_VISUAL === "true";

export { expect } from "@playwright/test";

import { test as base } from "@playwright/test";
import { Eyes, Configuration } from "@applitools/eyes-playwright";
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

    const eyes = new Eyes(Runner);
    const config = new Configuration();

    config.setBatch(Batch);
    config.setAppName("Specmatic Studio");
    config.setForceFullPageScreenshot(true);
    config.setIsDisabled(process.env.ENABLE_VISUAL !== "true");

    if (process.env.APPLITOOLS_API_KEY) {
      config.setApiKey(process.env.APPLITOOLS_API_KEY);
    }

    config.addBrowsers(
      { name: "chrome", width: 1920, height: 1200 },
      { name: "safari", width: 1920, height: 1200 },
      { name: "edge", width: 1920, height: 1200 },
    );

    config.setTestName(testInfo.title);
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
    }
  },
});
