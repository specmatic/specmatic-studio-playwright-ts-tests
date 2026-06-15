import { test, expect } from "../../../utils/eyesFixture";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { MockServerPage } from "../../../page-objects/mock-server-page";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import {
  PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK,
  SPECMATIC_CONFIG,
} from "../../specNames";
import { Page, TestInfo } from "playwright/test";

test.describe("Export Config Upgrade", () => {
  test(
    "Upgrade a v2 config to v3 from the contract-test sidebar flow",
    { tag: ["@config", "@exportAsConfig", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = createConfigPage(page, eyes, testInfo);
      const mockPage = new MockServerPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK,
      );
      const contractPage = new ApiContractPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK,
      );
      let exportFlowOutcome: "dialog" | "exported" | null = null;
      const mockUrl =
        await test.step(`Open '${PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK}' and start the mock`, async () => {
          await mockPage.openRunMockServerTab(
            PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK,
          );
          await mockPage.startMockServer();
          return await mockPage.getMockURL();
        });

      await test.step("Open the contract test tab, enter the mock URL, and click run", async () => {
        await mockPage.clickContractTestsTab();
        await mockPage.enterServiceBaseURL(mockUrl);
        await contractPage.clickRunContractTestsForExportFlow();
      });

      await test.step("Open the right sidebar and export as config", async () => {
        await configPage.rightSidebar.open();
        exportFlowOutcome =
          await configPage.rightSidebar.openExportAsConfigDialog();
      });

      await test.step("Complete the export flow", async () => {
        if (exportFlowOutcome === "dialog") {
          await configPage.rightSidebar.assertExportUpgradeDialog();
          await configPage.rightSidebar.confirmExportUpgrade();
          return;
        }

        await configPage.rightSidebar.assertExportSuccessToast();
      });

      await test.step("Open specmatic.yaml and assert the V3 config", async () => {
        const updatedConfig = await openSpecmaticConfigAndRead(configPage);
        const normalizedConfig = normalizeYaml(updatedConfig);

        expect(normalizedConfig).toContain("version: 3");
        expect(normalizedConfig).toContain("systemUnderTest:");
        expect(normalizedConfig).toContain("definitions:");
        expect(normalizedConfig).toContain("runOptions:");
        expect(normalizedConfig).toContain("settings:");
        expect(normalizedConfig).toContain(
          "test-specmatic-config/product_search_bff_v5_config_mock.yaml",
        );
        expect(normalizedConfig).toContain(mockUrl);
        expect(normalizedConfig).not.toContain("contracts:");
      });
    },
  );
});

function createConfigPage(page: Page, eyes: any, testInfo: TestInfo) {
  return new ServiceSpecConfigPage(page, testInfo, eyes, SPECMATIC_CONFIG);
}

function normalizeYaml(content: string) {
  return content.replace(/\r\n/g, "\n").trim();
}

async function openSpecmaticConfig(configPage: ServiceSpecConfigPage) {
  await configPage.gotoHomeAndOpenSidebar();
  await configPage.sideBar.selectSpec(SPECMATIC_CONFIG);
  await configPage.openSpecTab();
}

async function openSpecmaticConfigAndRead(configPage: ServiceSpecConfigPage) {
  await openSpecmaticConfig(configPage);
  return await configPage.getEditorDocumentText();
}
