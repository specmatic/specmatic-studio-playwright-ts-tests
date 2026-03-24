import { test, expect } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC_UPDATE } from "../../specNames";
import {
  ServiceSpecConfigPage,
  Edit,
} from "../../../page-objects/service-spec-config-page";

async function applyEditAndVerifySaveVisible(
  configPage: ServiceSpecConfigPage,
  page: any,
  eyes: unknown,
  stepName: string,
  edits: Edit[],
  screenshotName: string,
) {
  await test.step(stepName, async () => {
    await configPage.editSpec(edits);
    await expect(configPage.saveBtn).toBeVisible({ timeout: 5000 });
    await expect
      .poll(async () => configPage.saveBtn.getAttribute("hidden"))
      .toBeNull();
    await configPage.saveBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await takeAndAttachScreenshot(page, screenshotName, eyes);
  });
}

test.describe("Update Service Spec", () => {
  test(
    "Update Service Specification",
    { tag: ["@spec", "@updateConfig", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_UPDATE,
      );
      await test.step(`Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_UPDATE}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC_UPDATE);
        await configPage.openSpecTab();
      });

      await applyEditAndVerifySaveVisible(
        configPage,
        page,
        eyes,
        "Make a change and verify Save is shown",
        [
          {
            current: { mode: "keyOnly", key: "title" },
            changeTo: "title: Updated Order BFF",
          },
        ],
        "save-visible-after-change",
      );

      await applyEditAndVerifySaveVisible(
        configPage,
        page,
        eyes,
        "Revert the change and verify Save is still shown",
        [
          {
            current: { mode: "keyOnly", key: "title" },
            changeTo: "title: Order BFF",
          },
        ],
        "save-visible-after-revert",
      );

      await test.step("Save reverted Service Spec", async () => {
        await configPage.saveSpecAndAssertSuccessDialog();
      });
    },
  );
});
