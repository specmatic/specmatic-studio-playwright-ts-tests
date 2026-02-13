import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { SPECMATIC_CONFIG } from "../specNames";
import { ServiceSpecConfigPage } from "../../page-objects/service-spec-config-page";
const CONFIG_NAME = SPECMATIC_CONFIG;

test.describe("Service Spec & Config Update", () => {
  test(
    "Edit Specmatic Configuration",
    { tag: ["@serviceSpecConfig", "@editConfig"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(page, testInfo, eyes, CONFIG_NAME);

      await test.step(`Go to Spec page for Service Spec: '${CONFIG_NAME}'`, async () => {
          await configPage.gotoHomeAndOpenSidebar();
          await configPage.sideBar.selectSpec(CONFIG_NAME);
          await configPage.openSpecTab();
      });

      await test.step("Edit Config", async () => {
        await configPage.clickEditConfig();
      });
    },
  );
});
