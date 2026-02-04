// tags: ['@apiMocking', '@slow']
// suite: API Mocking
// scenario: Run Mock Server for API Spec

import { test, expect } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import type { Page, TestInfo } from "@playwright/test";

// Use Playwright baseURL from config
const SPEC_NAME = "product_search_bff_v5.yaml";

async function logAndScreenshot(page: Page, step: string, testInfo: TestInfo) {
  testInfo.attach("log", { body: Buffer.from(`Step: ${step}`) });
  await takeAndAttachScreenshot(
    page,
    step,
    testInfo.title,
    `${step}-screenshot`,
  );
}

test.describe("API Mocking", () => {
  test("Run Mock Server for API Spec", async ({ page }, testInfo) => {
    await page.goto("/");
    await takeAndAttachScreenshot(
      page,
      "app-loaded",
      testInfo.title,
      "app-loaded-screenshot",
    );

    // Select API spec
    const specLocator = page.locator("text=" + SPEC_NAME);
    await specLocator.click({ force: true });
    await takeAndAttachScreenshot(
      page,
      "selected-spec",
      testInfo.title,
      "selected-spec-screenshot",
    );

    // Click 'Run mock server' button
    const mockBtn = page.getByText(/Run mock server/i);
    await mockBtn.click({ force: true });
    await takeAndAttachScreenshot(
      page,
      "clicked-run-mock",
      testInfo.title,
      "clicked-run-mock-screenshot",
    );

    // Expect mock server status and port info
    const statusLocator = page.getByText(
      /Mock server is started|ready to serve requests|Port/i,
    );
    await expect(statusLocator).toBeVisible();
    await takeAndAttachScreenshot(
      page,
      "mock-server-started",
      testInfo.title,
      "mock-server-started-screenshot",
    );
  });
});
