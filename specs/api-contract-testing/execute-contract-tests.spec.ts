import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";

test.describe("API Contract Testing", () => {
  test(
    "Execute Contract Tests for API Spec",
    { tag: ["@apiContract"] },
    async ({ page }, testInfo) => {
      await page.goto("/");
      await takeAndAttachScreenshot(
        page,
        "app-loaded",
        testInfo.title,
        "app-loaded-screenshot",
      );

      const leftSidebar = page.locator("#left-sidebar");
      const sidebarToggleBtn = page.locator("button#left-sidebar-toggle");
      const isExpanded = await leftSidebar.getAttribute("aria-expanded");
      if (isExpanded === "false") {
        await page.evaluate(() => {
          const sidebar = document.getElementById("left-sidebar");
          if (sidebar) sidebar.setAttribute("aria-expanded", "true");
        });
        await takeAndAttachScreenshot(
          page,
          "sidebar-opened-via-js",
          testInfo.title,
          "sidebar-opened-via-js-screenshot",
        );
      } else {
        await takeAndAttachScreenshot(
          page,
          "sidebar-already-open",
          testInfo.title,
          "sidebar-already-open-screenshot",
        );
      }

      const specTree = page.locator("#spec-tree");
      await expect(specTree).toBeVisible({ timeout: 4000 });
      await takeAndAttachScreenshot(
        page,
        "spec-tree-visible",
        testInfo.title,
        "spec-tree-visible-screenshot",
      );

      const specLocator = specTree.locator("text=" + PRODUCT_SEARCH_BFF_SPEC);
      await expect(specLocator).toBeVisible({ timeout: 4000 });
      await specLocator.click({ force: true });
      await takeAndAttachScreenshot(
        page,
        "selected-spec",
        testInfo.title,
        "selected-spec-screenshot",
      );

      const testBtn = page.getByText(/Execute contract tests/i);
      await expect(testBtn).toBeVisible({ timeout: 4000 });
      await testBtn.click({ force: true });
      await takeAndAttachScreenshot(
        page,
        "clicked-execute-tests",
        testInfo.title,
        "clicked-execute-tests-screenshot",
      );
    },
  );
});
