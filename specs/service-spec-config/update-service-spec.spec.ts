import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ServiceSpecConfigPage } from "../../page-objects/service-spec-config-page";

test.describe("Service Spec & Config Update", () => {
  test(
    "Update Service Specification",
    { tag: ["@serviceSpecConfig"] },
    async ({ page }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(page, testInfo);
      await configPage.goto();
      await configPage.ensureSidebarOpen();
      await configPage.selectConfig(PRODUCT_SEARCH_BFF_SPEC);
      await configPage.clickUpdateSpec();
      await configPage.clickSaveOpenApi();

      page.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("Contents saved successfully");
        await dialog.dismiss();
      });
      await takeAndAttachScreenshot(page, "save-clicked-screenshot");
    },
  );
});
