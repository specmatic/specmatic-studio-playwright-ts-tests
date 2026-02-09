import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ServiceSpecConfigPage } from "../../page-objects/service-spec-config-page";

test.describe("Service Spec & Config Update", () => {
  test(
    "Update Service Specification",
    { tag: ["@serviceSpecConfig"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(page, testInfo, eyes);
      await test.step("Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'", async () => {
        await test.step("Open sidebar", async () => {
          await configPage.goto();
          await configPage.ensureSidebarOpen();
        });
        await test.step(`Navigate to Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}' and click Generate Examples`, async () => {
          await configPage.selectConfig(PRODUCT_SEARCH_BFF_SPEC);
        });
        await test.step("Go to Spec", async () => {
          await configPage.clickUpdateSpec();
        });
      });
      await test.step("Save updated Service Spec", async () => {
        await configPage.clickSaveOpenApi();
        // page.once("dialog", async (dialog) => {
        //   expect(dialog.message()).toContain("Contents saved successfully");
        //   await dialog.dismiss();
        // });
        await takeAndAttachScreenshot(page, "save-clicked-screenshot", eyes);
      });
    },
  );
});
