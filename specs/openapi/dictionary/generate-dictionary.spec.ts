import { expect, test } from "../../../utils/eyesFixture";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC_GENERATE_DICTIONARY } from "../../specNames";

interface DictionaryTestContext {
  sourceSpecName: string;
  dictionarySpecName: string;
  sourceSpecPage: ServiceSpecConfigPage;
}

function getDictionarySpecName(specName: string): string {
  return specName.replace(/\.yaml$/, "_dictionary.yaml");
}

function shouldReloadBeforeOpeningDictionary(): boolean {
  return process.platform === "win32" || process.platform === "linux";
}

async function openSpecFromSidebar(
  specPage: ServiceSpecConfigPage,
  specName: string,
) {
  await specPage.gotoHomeAndOpenSidebar();
  await specPage.sideBar.selectSpec(specName);
}

async function openSourceSpec(context: DictionaryTestContext) {
  await openSpecFromSidebar(context.sourceSpecPage, context.sourceSpecName);
  await context.sourceSpecPage.openSpecTab();
}

async function openDictionarySpec(
  context: DictionaryTestContext,
  page: any,
  testInfo: any,
  eyes: any,
) {
  if (shouldReloadBeforeOpeningDictionary()) {
    await page.reload();
  }

  const dictionaryPage = new ServiceSpecConfigPage(
    page,
    testInfo,
    eyes,
    context.dictionarySpecName,
  );

  await openSpecFromSidebar(dictionaryPage, context.dictionarySpecName);
  await dictionaryPage.openSpecTab();

  return dictionaryPage;
}

async function generateDictionaryAndReadContents(
  context: DictionaryTestContext,
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

test.describe("Generate Dictionary", () => {
  test(
    "Generate dictionary twice and keep contents stable",
    { tag: ["@spec", "@generateDictionary", "@eyes", "@expected-failure"] },
    async ({ page, eyes }, testInfo) => {
      test.fail(true, "File Watcher issue in Windows");
      const sourceSpecName = PRODUCT_SEARCH_BFF_SPEC_GENERATE_DICTIONARY;
      const context: DictionaryTestContext = {
        sourceSpecName,
        dictionarySpecName: getDictionarySpecName(sourceSpecName),
        sourceSpecPage: new ServiceSpecConfigPage(
          page,
          testInfo,
          eyes,
          sourceSpecName,
        ),
      };

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
