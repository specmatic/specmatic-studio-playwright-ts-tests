export { expect } from "@playwright/test";
import { test as base, Page } from "@playwright/test";
import { Eyes, Configuration } from "@applitools/eyes-playwright";

type BatchInfoPlain = { name: string; id?: string; startedAt?: string | Date };

export const test = base.extend<{ eyes: Eyes }>({
  eyes: async ({ page }, use, testInfo) => {
    const eyes = new Eyes();
    const config = new Configuration();
    config.setAppName("Specmatic Studio");
    config.setTestName(testInfo.title);
    const batch: BatchInfoPlain = { name: testInfo.project.name };
    config.setBatch(batch);
    config.addBrowsers(
      { width: 1200, height: 800, name: "chrome" },
      { width: 1200, height: 800, name: "firefox" },
      { width: 1200, height: 800, name: "safari" },
    );
    config.setConcurrentSessions(5);
    eyes.setConfiguration(config);
    await eyes.open(page);
    await use(eyes);
    try {
      await eyes.close();
    } catch (e) {
      await eyes.abort();
    }
  },
});
