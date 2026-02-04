// tags: ['@exampleGeneration', '@slow']
// suite: Example Generation
// scenario: Generate Valid Examples from API Spec

import { test, expect } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
// Use Playwright baseURL from config
const SPEC_NAME = "product_search_bff_v5.yaml";

test.describe("Example Generation", () => {
  test("Generate Valid Examples from API Spec", async ({ page }, testInfo) => {
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

    // Click 'Generate valid examples' button
    const examplesBtn = page.getByText(/Generate valid examples/i);
    await examplesBtn.click({ force: true });
    await takeAndAttachScreenshot(
      page,
      "clicked-generate-examples",
      testInfo.title,
      "clicked-generate-examples-screenshot",
    );

    // Expect examples to be displayed
    const examplesLocator = page.getByText(/Valid examples|Request|Response/i);
    await expect(examplesLocator).toBeVisible();
    await takeAndAttachScreenshot(
      page,
      "examples-visible",
      testInfo.title,
      "examples-visible-screenshot",
    );
  });
});
