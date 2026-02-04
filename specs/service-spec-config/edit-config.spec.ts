// tags: ['@serviceSpecConfig', '@slow']
// suite: Service Spec & Config Update
// scenario: Edit Specmatic Configuration

import { test, expect } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
// Use Playwright baseURL from config
const CONFIG_NAME = "specmatic.yaml";

test.describe("Service Spec & Config Update", () => {
  test("Edit Specmatic Configuration", async ({ page }, testInfo) => {
    await page.goto("/");
    await takeAndAttachScreenshot(
      page,
      "app-loaded",
      testInfo.title,
      "app-loaded-screenshot",
    );

    // Select config file
    const configLocator = page.locator("text=" + CONFIG_NAME);
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

    // Expect configuration changes confirmation
    const confirmationLocator = page.getByText(
      /Configuration changes are saved|reflected/i,
    );
    await expect(confirmationLocator).toBeVisible();
    await takeAndAttachScreenshot(
      page,
      "config-changes-confirmed",
      testInfo.title,
      "config-changes-confirmed-screenshot",
    );
  });
});
