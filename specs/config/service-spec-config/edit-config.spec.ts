import { test, expect } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { SPECMATIC_CONFIG } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { Page } from "playwright/test";
const CONFIG_NAME = SPECMATIC_CONFIG;

test.describe("Specmatic Config", () => {
  test(
    "See Specmatic Configuration",
    { tag: ["@config", "@editConfig", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        CONFIG_NAME,
      );

      await test.step(`Go to Spec page for Service Spec: '${CONFIG_NAME}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(CONFIG_NAME);
        await configPage.openSpecTab();
      });

      await test.step("Click Run Suite and Assert the Status", async () => {
        await configPage.clickRunSuite();
        await assertErrorDialog(configPage, "Failed to execute");
        await configPage.dismissAlert();
        await configPage.rightSidebar.close();
        await assertExecutionDropDown(configPage, page, "error", "Failed");
        await expect(configPage.executionLog).toContainText(
          "Invalid mock configuration for proxy_generated.yaml",
        );
        await takeAndAttachScreenshot(
          page,
          "asserted-execution-progress-dropdown",
          eyes,
        );
      });

      await test.step("Edit Spec, Save and Verify Progress", async () => {
        await configPage.deleteSpecLinesInEditor("- port: 9090", 3);
        await configPage.clickSaveAfterEdit();
        await configPage.clickRunSuite();
        await configPage.rightSidebar.close();
        await assertExecutionDropDown(configPage, page, "running", "Running");
        await takeAndAttachScreenshot(page, "suite-status-running", eyes);
        await configPage.waitForExecutionToComplete();
        await assertErrorDialog(
          configPage,
          "Mock Server Stopped",
          "StandaloneCoroutine was cancelled",
        );
        await configPage.dismissAlert();
        await assertExecutionDropDown(configPage, page, "error", "Failed");
        await expect(configPage.executionLog).toContainText(
          "Starting mock: kafka.yaml (port=0)",
        );
        await expect(configPage.executionLog).toContainText(
          "Failed to start mock server for kafka.yaml",
        );
        await takeAndAttachScreenshot(
          page,
          "execution-progress-assertion-after-spec-change",
          eyes,
        );
      });
    },
  );
});

async function assertExecutionDropDown(
  configPage: ServiceSpecConfigPage,
  page: Page,
  state: "error" | "success" | "running",
  expectedStatus: string,
) {
  const dropdown = configPage.executionProgressDropdown;

  await expect(dropdown).toBeVisible({ timeout: 10000 });
  await expect(dropdown).toHaveAttribute("data-state", state, {
    timeout: 5000,
  });
  await expect(dropdown).toHaveAttribute("open", "");

  const statusText = dropdown.locator(".execution-progress-status");
  await expect(statusText).toHaveText(expectedStatus, { timeout: 5000 });

  await takeAndAttachScreenshot(page, `execution-progress-asserted-${state}`);
}

async function assertErrorDialog(
  configPage: ServiceSpecConfigPage,
  expectedTitle: string,
  expectedDesc?: string,
) {
  await expect(configPage.alertContainer).toBeVisible();
  await expect(configPage.alertTitle).toHaveText(expectedTitle);
  if (expectedDesc) {
    await expect(configPage.alertDescription).toContainText(expectedDesc);
  }
}
