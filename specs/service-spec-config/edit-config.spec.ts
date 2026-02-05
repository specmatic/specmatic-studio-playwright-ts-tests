import { test, expect } from "@playwright/test";
// import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { SPECMATIC_CONFIG } from "../specNames";
import { ServiceSpecConfigPage } from "../../page-objects/service-spec-config-page";
const CONFIG_NAME = SPECMATIC_CONFIG;

test.describe("Service Spec & Config Update", () => {
  test(
    "Edit Specmatic Configuration",
    { tag: ["@serviceSpecConfig"] },
    async ({ page }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(page, testInfo);
      await configPage.goto();
      await configPage.ensureSidebarOpen();
      await configPage.selectConfig(CONFIG_NAME);
      await configPage.clickEditConfig();
    },
  );
});
