import { expect, test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY } from "../../specNames";

const PRODUCTS_PATH = "products";
const FIND_AVAILABLE_PRODUCTS_PATH = "findAvailableProducts";
const PRODUCT_CREATED_STATUS = 201;
const FIND_AVAILABLE_PRODUCTS_STATUS = 200;

interface DictionaryDeletionContext {
  sourceSpecName: string;
  dictionarySpecName: string;
  sourceSpecPage: ServiceSpecConfigPage;
  examplePage: ExampleGenerationPage;
}

interface CapturedExampleValues {
  deletedProductName: string;
  retainedPageSize: string;
  retainedQueryType: string;
}

function getDictionarySpecName(specName: string): string {
  return specName.replace(/\.yaml$/, "_dictionary.yaml");
}

function shouldReloadBeforeOpeningDictionary(): boolean {
  return process.platform === "win32" || process.platform === "linux";
}

function extractJsonStringValue(
  content: string,
  key: string,
): string | undefined {
  const match = content.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
  return match?.[1];
}

async function openSpecFromSidebar(
  specPage: ServiceSpecConfigPage,
  specName: string,
) {
  await specPage.gotoHomeAndOpenSidebar();
  await specPage.sideBar.selectSpec(specName);
}

async function openSourceSpec(context: DictionaryDeletionContext) {
  await openSpecFromSidebar(context.sourceSpecPage, context.sourceSpecName);
  await context.sourceSpecPage.openSpecTab();
}

async function openExamplesTab(
  context: DictionaryDeletionContext,
  testInfo: any,
  eyes: any,
  reopenFromSidebar = true,
) {
  if (reopenFromSidebar) {
    await context.examplePage.openExampleGenerationTabForSpec(
      testInfo,
      eyes,
      context.sourceSpecName,
    );
    return;
  }

  await context.examplePage.openExampleGenerationTabFromTab();
}

async function captureInitialExampleValues(
  context: DictionaryDeletionContext,
  page: any,
  testInfo: any,
  eyes: any,
): Promise<CapturedExampleValues> {
  await openExamplesTab(context, testInfo, eyes);
  await context.examplePage.deleteGeneratedExamples();

  await context.examplePage.generateExampleAndViewDetailsForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
  await takeAndAttachScreenshot(page, "delete-flow-products-example", eyes);
  const productsContent = await context.examplePage.getEditorContent();
  const deletedProductName = extractJsonStringValue(productsContent, "name");
  expect(deletedProductName).toBeTruthy();
  await context.examplePage.goBackFromExample();

  await context.examplePage.generateExampleAndViewDetailsForPath(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
  );
  await takeAndAttachScreenshot(
    page,
    "delete-flow-find-available-products-example",
    eyes,
  );
  const findAvailableProductsContent =
    await context.examplePage.getEditorContent();
  const retainedPageSize = extractJsonStringValue(
    findAvailableProductsContent,
    "pageSize",
  );
  const retainedQueryType = extractJsonStringValue(
    findAvailableProductsContent,
    "type",
  );
  expect(retainedPageSize).toBeTruthy();
  expect(retainedQueryType).toBeTruthy();
  await context.examplePage.goBackFromExample();

  return {
    deletedProductName: String(deletedProductName),
    retainedPageSize: String(retainedPageSize),
    retainedQueryType: String(retainedQueryType),
  };
}

async function deleteOneGeneratedExample(
  context: DictionaryDeletionContext,
  testInfo: any,
  eyes: any,
) {
  await openExamplesTab(context, testInfo, eyes, false);
  await context.examplePage.deleteGeneratedExampleForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
}

async function openDictionarySpec(
  context: DictionaryDeletionContext,
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
  context: DictionaryDeletionContext,
  page: any,
  testInfo: any,
  eyes: any,
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
  await takeAndAttachScreenshot(
    page,
    "dictionary-after-example-deletion",
    eyes,
  );

  return dictionaryContent;
}

test.describe("Examples Delete Then Dictionary", () => {
  test(
    "Generate examples, delete one example, then generate dictionary from the remaining examples",
    {
      tag: ["@spec", "@generateDictionaryWithDeletedExamples", "@eyes"],
    },
    async ({ page, eyes }, testInfo) => {
      const sourceSpecName =
        PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY;
      const context: DictionaryDeletionContext = {
        sourceSpecName,
        dictionarySpecName: getDictionarySpecName(sourceSpecName),
        sourceSpecPage: new ServiceSpecConfigPage(
          page,
          testInfo,
          eyes,
          sourceSpecName,
        ),
        examplePage: new ExampleGenerationPage(
          page,
          testInfo,
          eyes,
          sourceSpecName,
        ),
      };

      let capturedValues!: CapturedExampleValues;

      await test.step("Generate examples for multiple endpoints and capture the values to validate later", async () => {
        capturedValues = await captureInitialExampleValues(
          context,
          page,
          testInfo,
          eyes,
        );
      });

      await test.step("Delete one generated example", async () => {
        await deleteOneGeneratedExample(context, testInfo, eyes);
      });

      await test.step("Generate dictionary and validate it reflects the remaining examples", async () => {
        await openSourceSpec(context);
        const dictionaryContent = await generateDictionaryAndReadContents(
          context,
          page,
          testInfo,
          eyes,
        );

        expect(dictionaryContent).not.toContain(
          capturedValues.deletedProductName,
        );
        expect(dictionaryContent).toContain(
          `- ${capturedValues.retainedPageSize}`,
        );
        expect(dictionaryContent).toContain(
          `- ${capturedValues.retainedQueryType}`,
        );
      });
    },
  );
});
