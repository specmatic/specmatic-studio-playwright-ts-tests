import { expect, test } from "../../../utils/eyesFixture";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC_GENERATE_DICTIONARY } from "../../specNames";
import {
  createDictionarySpecContext,
  openSpecFromSidebar,
  openSourceSpec,
} from "./dictionary-test-utils";

test.describe("Generate Dictionary", () => {
  test(
    "Generate dictionary twice and keep contents stable",
    { tag: ["@spec", "@generateDictionary", "@eyes", "@expected-failure"] },
    async ({ page, eyes }, testInfo) => {
      test.fail(true, "File Watcher issue in Windows");
      const context = createDictionarySpecContext(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_GENERATE_DICTIONARY,
      );

      await test.step(`Go to Spec page for Service Spec: '${context.sourceSpecName}'`, async () => {
        await openSourceSpec(context);
      });

      let firstGeneratedDictionaryContents = "";

      await test.step("Generate dictionary the first time and capture the full editor content", async () => {
        firstGeneratedDictionaryContents =
          await generateDictionaryAndReadContents(
            context,
            page,
            testInfo,
            eyes,
            "first-run",
          );
        expect(firstGeneratedDictionaryContents).not.toBe("");
      });

      await test.step("Generate dictionary the second time and compare it with the first result", async () => {
        await openSourceSpec(context);
        const secondGeneratedDictionaryContents =
          await generateDictionaryAndReadContents(
            context,
            page,
            testInfo,
            eyes,
            "second-run",
          );

        expect(secondGeneratedDictionaryContents).toBe(
          firstGeneratedDictionaryContents,
        );
      });
    },
  );
});

function shouldReloadBeforeOpeningDictionary(): boolean {
  return process.platform === "win32";
}

async function openDictionarySpec(
  context: ReturnType<typeof createDictionarySpecContext>,
  page: any,
  testInfo: any,
  eyes: any,
) {
  const dictionaryPage = new ServiceSpecConfigPage(
    page,
    testInfo,
    eyes,
    context.dictionarySpecName,
  );

  const dictionaryFileName = context.dictionarySpecName.split("/").pop()!;
  const autoOpenedDictionaryEditor = page
    .locator(
      `xpath=//div[contains(@id,"${dictionaryFileName}") and @data-mode="spec"]//div[contains(@class,"cm-content")]`,
    )
    .first();
  const isAutoOpened = await autoOpenedDictionaryEditor
    .isVisible()
    .catch(() => false);

  if (!isAutoOpened && shouldReloadBeforeOpeningDictionary()) {
    await page.reload();
  }

  if (!isAutoOpened) {
    await openSpecFromSidebar(dictionaryPage, context.dictionarySpecName);
    await dictionaryPage.openSpecTab();
  }

  return dictionaryPage;
}

async function generateDictionaryAndReadContents(
  context: ReturnType<typeof createDictionarySpecContext>,
  page: any,
  testInfo: any,
  eyes: any,
  runLabel: string,
) {
  await context.sourceSpecPage.generateDictionary();
  await context.sourceSpecPage.assertGeneratedDictionaryDialog(
    context.dictionarySpecName,
  );
  await context.sourceSpecPage.dismissAlert();
  await expect(page.locator("#alert-container")).toBeEmpty();

  const dictionaryPage = await openDictionarySpec(
    context,
    page,
    testInfo,
    eyes,
  );
  const dictionaryContent = await dictionaryPage.getEditorDocumentText();
  await page.waitForTimeout(300);
  await takeAndAttachScreenshot(
    page,
    `dictionary-editor-opened-${runLabel}`,
    eyes,
  );

  return dictionaryContent;
}
