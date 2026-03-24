import { test, expect } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { INVENTORY_WSDL_CONTRACT_TESTS } from "../../specNames";

async function applyEditActionAndVerifySaveVisible(
  configPage: ServiceSpecConfigPage,
  page: any,
  eyes: unknown,
  stepName: string,
  editAction: () => Promise<void>,
  screenshotName: string,
) {
  await test.step(stepName, async () => {
    await editAction();
    await expect(configPage.saveBtn).toBeVisible({ timeout: 5000 });
    await expect
      .poll(async () => configPage.saveBtn.getAttribute("hidden"))
      .toBeNull();
    await configPage.saveBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await takeAndAttachScreenshot(page, screenshotName, eyes);
  });
}

test.describe("Saving SOAP Spec", () => {
  test(
    "Save SOAP Spec",
    { tag: ["@soap", "@spec", "@saveSOAPSpec", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        INVENTORY_WSDL_CONTRACT_TESTS,
      );

      await test.step(`Go to Spec page for Service Spec: '${INVENTORY_WSDL_CONTRACT_TESTS}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(INVENTORY_WSDL_CONTRACT_TESTS);
        await configPage.openSpecTab();
      });

      await applyEditActionAndVerifySaveVisible(
        configPage,
        page,
        eyes,
        "Make a change and verify Save is shown",
        () =>
          configPage.editSpecInEditor(
            '<wsdl:service name="InventoryService">',
            '<wsdl:service name="UpdatedInventoryService">',
          ),
        "save-visible-after-change",
      );

      await applyEditActionAndVerifySaveVisible(
        configPage,
        page,
        eyes,
        "Revert the change and verify Save is still shown",
        () =>
          configPage.editSpecInEditor(
            '<wsdl:service name="UpdatedInventoryService">',
            '<wsdl:service name="InventoryService">',
          ),
        "save-visible-after-revert",
      );

      await test.step("Save reverted SOAP Spec", async () => {
        await configPage.saveSpecAndAssertSuccessDialog();
      });
    },
  );
});
