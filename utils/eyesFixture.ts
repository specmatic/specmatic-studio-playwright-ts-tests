// Read ENABLE_VISUAL from environment (set by playwright.config.ts loading the correct .env file)
export const ENABLE_VISUAL = process.env.ENABLE_VISUAL === "true";
export { expect } from "@playwright/test";
import { test as base, Page } from "@playwright/test";
import { Eyes, Configuration } from "@applitools/eyes-playwright";
import { Batch, Runner } from "./global-setup";

export const test = base.extend<{ eyes: Eyes }>({
  eyes: async ({ page }, use, testInfo) => {
    if (ENABLE_VISUAL && testInfo.timeout < 120000) {
      // Increase timeout to 2 minutes for visual tests
      testInfo.setTimeout(120000);
    }
    // console.log(`Configuring Eyes for test: '${testInfo.title}'`);
    const eyes = new Eyes(Runner);
    const config = new Configuration();
    // console.log(`\tBatch Name in eyes fixture: ${Batch.getName()}`);
    // console.log(`\tBatch ID in eyes fixture: ${Batch.getId()}`);
    // console.log(
    //   `\tBatch Sequence Name in eyes fixture: ${Batch.getSequenceName()}`,
    // );
    config.setBatch(Batch);
    config.setAppName("Specmatic Studio");
    config.setForceFullPageScreenshot(true);
    config.setIsDisabled(process.env.ENABLE_VISUAL !== "true");
    if (process.env.APPLITOOLS_API_KEY) {
      config.setApiKey(process.env.APPLITOOLS_API_KEY);
    }
    config.addBrowsers(
      { name: "chrome", width: 800, height: 600 },
      { name: "firefox", width: 1600, height: 1200 },
      { name: "safari", width: 1024, height: 768 },
      {
        chromeEmulationInfo: {
          deviceName: "iPhone 11",
          screenOrientation: "portrait",
        },
      },
      {
        chromeEmulationInfo: {
          deviceName: "Nexus 10",
          screenOrientation: "landscape",
        },
      },
    );
    config.setTestName(testInfo.title);
    eyes.setConfiguration(config);
    await eyes.open(page);
    await use(eyes);
    try {
      const results = await eyes.close(false);
      console.log(`Test '${testInfo.title}' - Eyes results:`, results);
    } catch (error) {
      console.error("Error closing Eyes:", error);
      await eyes.abortIfNotClosed();
    }
  },
});
