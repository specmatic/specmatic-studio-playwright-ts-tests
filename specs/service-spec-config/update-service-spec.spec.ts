// tags: ['@serviceSpecConfig', '@slow']
// suite: Service Spec & Config Update
// scenario: Update Service Specification

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

test.describe("Service Spec & Config Update", () => {
  test("Update Service Specification", async ({ page }, testInfo) => {
    await page.goto("/");
    await logAndScreenshot(page, "app-loaded", testInfo);

    // Select API spec
    const specLocator = page.locator("text=" + SPEC_NAME);
    await specLocator.click({ force: true });
    await logAndScreenshot(page, "selected-spec", testInfo);

    // Click 'Update service spec' button
    const updateBtn = page.getByText(/Update service spec/i);
    await updateBtn.click({ force: true });
    await logAndScreenshot(page, "clicked-update-spec", testInfo);

    // Expect confirmation message
    const confirmationLocator = page.getByText(
      /Service specification is updated|Confirmation/i,
    );
    await expect(confirmationLocator).toBeVisible();
    await logAndScreenshot(page, "update-confirmation", testInfo);
  });
});
