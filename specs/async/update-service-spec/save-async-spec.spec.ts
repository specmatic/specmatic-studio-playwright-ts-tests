import { test, expect } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import {
  ServiceSpecConfigPage,
  Edit,
} from "../../../page-objects/service-spec-config-page";
import { KAFKA_CONTRACT_TESTS } from "../../specNames";

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

test.describe("Saving Async Spec", () => {
  test(
    "Save Async Spec",
    { tag: ["@async", "@spec", "@saveAsyncSpec", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        KAFKA_CONTRACT_TESTS,
      );

      await test.step(`Go to Spec page for Service Spec: '${KAFKA_CONTRACT_TESTS}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(KAFKA_CONTRACT_TESTS);
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
            changeTo: "title: Updated Product audits API",
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
            changeTo: "title: Product audits API",
          },
        ],
        "save-visible-after-revert",
      );

      await test.step("Save reverted Async Spec", async () => {
        await configPage.saveSpecAndAssertSuccessDialog();
      });
    },
  );
});
