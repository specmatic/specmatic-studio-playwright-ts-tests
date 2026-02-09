import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { SPECMATIC_CONFIG } from "../specNames";
import { ServiceSpecConfigPage } from "../../page-objects/service-spec-config-page";
const CONFIG_NAME = SPECMATIC_CONFIG;

test.describe("Service Spec & Config Update", () => {
  test(
    "Edit Specmatic Configuration",
    { tag: ["@serviceSpecConfig"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(page, testInfo, eyes);

      await test.step(`Go to Spec page for Service Spec: '${CONFIG_NAME}'`, async () => {
        await test.step("Open sidebar", async () => {
          await configPage.goto();
          await configPage.ensureSidebarOpen();
        });
        await test.step(`Navigate to Service Spec: '${CONFIG_NAME}'`, async () => {
          await configPage.selectConfig(CONFIG_NAME);
        });
        await test.step("Go to Spec", async () => {
          await configPage.clickUpdateSpec();
        });
      });

      await test.step("Edit Config", async () => {
        await configPage.clickEditConfig();
      });
    },
  );
});
