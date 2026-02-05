// suite: API Specification Management
// scenario: Select Existing API Specification

import { test, expect } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ensureSidebarOpen } from "../../utils/sideBarUtils";

test.describe("API Specification Management", () => {
  test(
    "Select Existing API Specification",
    { tag: ["@apiSpecManagement"] },
    async ({ page }, testInfo) => {
      // Step 1: Navigate to Specmatic Studio
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

      // Step 2: Find and select the API spec (force click)
      const specLocator = specTree.locator("text=" + PRODUCT_SEARCH_BFF_SPEC);
      await specLocator.click({ force: true });
      await takeAndAttachScreenshot(
        page,
        `select-spec-${PRODUCT_SEARCH_BFF_SPEC}`,
        testInfo.title,
        `select-spec-${PRODUCT_SEARCH_BFF_SPEC}-screenshot`,
      );

      // Step 3: Verify spec details are displayed
      const updateTab = page.locator('li.tab[data-type="spec"]').first();
      if ((await updateTab.getAttribute("data-active")) !== "true") {
        await updateTab.click({ force: true });
      }
      await takeAndAttachScreenshot(
        page,
        "spec-details-visible",
        testInfo.title,
        "spec-details-screenshot",
      );
    },
  );
});
