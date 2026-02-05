// suite: API Mocking
// scenario: Run Mock Server for API Spec

import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { ensureSidebarOpen } from "../../utils/sideBarUtils";
import { PRODUCT_SEARCH_BFF_SPEC, MOCK_SERVER_PORT } from "../specNames";
// Use Playwright baseURL from config

test.describe("API Mocking", () => {
  test(
    "Run Mock Server for API Spec",
    { tag: ["@apiMocking"] },
    async ({ page }, testInfo) => {
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
      await expect(specLocator).toBeVisible({ timeout: 4000 });
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
      // const statusLocator = page.getByText(
      //   /Mock server is started|ready to serve requests|Port/i,
      // );
      // await expect(statusLocator).toBeVisible();
      // await takeAndAttachScreenshot(
      //   page,
      //   "mock-server-started",
      //   testInfo.title,
      //   "mock-server-started-screenshot",
      // );
    },
  );
});
