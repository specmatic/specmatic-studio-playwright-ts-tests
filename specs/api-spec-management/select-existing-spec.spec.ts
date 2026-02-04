// tags: ['@apiSpecManagement', '@slow']
// suite: API Specification Management
// scenario: Select Existing API Specification

import { test, expect } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
// Use Playwright baseURL from config
const SPEC_NAME = "product_search_bff_v5.yaml";

test.describe("API Specification Management", () => {
  test("Select Existing API Specification", async ({ page }, testInfo) => {
    // Step 1: Navigate to Specmatic Studio
    await page.goto("/");
    await takeAndAttachScreenshot(
      page,
      "app-loaded",
      testInfo.title,
      "app-loaded-screenshot",
    );

    // Step 2: Find and select the API spec (force click)
    const specLocator = page.locator("text=" + SPEC_NAME);
    await specLocator.scrollIntoViewIfNeeded();
    await specLocator.click({ force: true });
    await takeAndAttachScreenshot(
      page,
      `select-spec-${SPEC_NAME}`,
      testInfo.title,
      `select-spec-${SPEC_NAME}-screenshot`,
    );

    // Step 3: Verify spec details are displayed
    const detailsLocator = page.locator(`text=File path: ./` + SPEC_NAME);
    await expect(detailsLocator).toBeVisible();
    await takeAndAttachScreenshot(
      page,
      "spec-details-visible",
      testInfo.title,
      "spec-details-screenshot",
    );
  });
});
