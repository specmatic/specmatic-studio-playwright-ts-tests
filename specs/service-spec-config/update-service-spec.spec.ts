// suite: Service Spec & Config Update
// scenario: Update Service Specification

import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { ensureSidebarOpen } from "../../utils/sideBarUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
// Use Playwright baseURL from config

test.describe("Service Spec & Config Update", () => {
  test(
    "Update Service Specification",
    { tag: ["@serviceSpecConfig"] },
    async ({ page }, testInfo) => {
      await page.goto("/");
      await takeAndAttachScreenshot(
        page,
        "app-loaded",
        testInfo.title,
        "app-loaded-screenshot",
      );

      await ensureSidebarOpen(page);

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

      // Click 'Update service spec' button
      const updateTab = page.locator('li.tab[data-type="spec"]').first();
      if ((await updateTab.getAttribute("data-active")) !== "true") {
        await updateTab.click({ force: true });
      }
      await takeAndAttachScreenshot(
        page,
        "clicked-update-spec",
        testInfo.title,
        "clicked-update-spec-screenshot",
      );

      const saveBtn = page.locator('button[data-validate="/openapi"]');
      await saveBtn.click({ force: true });
      await takeAndAttachScreenshot(
        page,
        "save-clicked",
        testInfo.title,
        "save-clicked-screenshot",
      );

      // Expect confirmation message
      page.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("Contents saved successfully");
        await dialog.dismiss();
      });
      await takeAndAttachScreenshot(
        page,
        "save-clicked",
        testInfo.title,
        "save-clicked-screenshot",
      );
    },
  );
});
