// tags: ['@serviceSpecConfig', '@slow']
// suite: Service Spec & Config Update
// scenario: Edit Specmatic Configuration

import { test, expect } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { ensureSidebarOpen } from "../../utils/sideBarUtils";
import { SPECMATIC_CONFIG } from "../specNames";
const CONFIG_NAME = SPECMATIC_CONFIG;
// Use Playwright baseURL from config

test.describe("Service Spec & Config Update", () => {
  test("Edit Specmatic Configuration", async ({ page }, testInfo) => {
    await page.goto("/");

    await ensureSidebarOpen(page);
    await takeAndAttachScreenshot(
      page,
      "sidebar-open",
      testInfo.title,
      "sidebar-screenshot",
    );

    // Wait for spec list to load
    const specTree = page.locator("#spec-tree");
    await expect(specTree).toBeVisible({ timeout: 4000 });

    // Select config file
    const configLocator = specTree.locator("text=" + CONFIG_NAME);
    await configLocator.click({ force: true });
    await takeAndAttachScreenshot(
      page,
      "selected-config",
      testInfo.title,
      "selected-config-screenshot",
    );

    // Click 'Edit specmatic.yaml' button
    const editBtn = page.getByText(/Edit specmatic.yaml/i);
    await editBtn.click({ force: true });
    await takeAndAttachScreenshot(
      page,
      "clicked-edit-config",
      testInfo.title,
      "clicked-edit-config-screenshot",
    );
  });
});
