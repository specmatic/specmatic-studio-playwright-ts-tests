// tags: ['@exampleGeneration', '@slow']
// suite: Example Generation
// scenario: Generate Valid Examples from API Spec

import { test, expect } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { ensureSidebarOpen } from "../../utils/sideBarUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
// Use Playwright baseURL from config

test.describe("Example Generation", () => {
  test("Generate Valid Examples from API Spec", async ({ page }, testInfo) => {
    await page.goto("/");
    await takeAndAttachScreenshot(
      page,
      "app-loaded",
      testInfo.title,
      "app-loaded-screenshot",
    );

    await ensureSidebarOpen(page);
    await takeAndAttachScreenshot(
      page,
      "sidebar-open",
      testInfo.title,
      "sidebar-screenshot",
    );

    const specTree = page.locator("#spec-tree");
    await expect(specTree).toBeVisible({ timeout: 4000 });
    await takeAndAttachScreenshot(
      page,
      "spec-tree-visible",
      testInfo.title,
      "spec-tree-visible-screenshot",
    );

    // Select API spec
    const specLocator = specTree.locator("text=" + PRODUCT_SEARCH_BFF_SPEC);
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
  });
});
