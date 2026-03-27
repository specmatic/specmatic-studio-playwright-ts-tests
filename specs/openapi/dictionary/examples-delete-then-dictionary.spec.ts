import { expect, test } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY } from "../../specNames";
import {
  createDictionaryExamplesContext,
  extractJsonStringValue,
  generateDictionaryAndOpenIt,
  openExamplesTab,
  type DictionaryExamplesContext,
} from "./dictionary-test-utils";

test.describe("Examples Delete Then Dictionary", () => {
  test(
    "Generate examples, delete one example, then generate dictionary from the remaining examples",
    {
      tag: ["@spec", "@generateDictionaryWithDeletedExamples", "@eyes"],
    },
    async ({ page, eyes }, testInfo) => {
      const context = createDictionaryExamplesContext(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY,
      );
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
        await assertDictionaryReflectsRemainingExamples(
          context,
          page,
          testInfo,
          eyes,
          capturedValues,
        );
      });
    },
  );
});

const PRODUCTS_PATH = "products";
const FIND_AVAILABLE_PRODUCTS_PATH = "findAvailableProducts";
const PRODUCT_CREATED_STATUS = 201;
const FIND_AVAILABLE_PRODUCTS_STATUS = 200;

interface CapturedExampleValues {
  deletedProductName: string;
  retainedPageSize: string;
  retainedQueryType: string;
}

async function captureInitialExampleValues(
  context: DictionaryExamplesContext,
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
  context: DictionaryExamplesContext,
  testInfo: any,
  eyes: any,
) {
  await openExamplesTab(context, testInfo, eyes, false);
  await context.examplePage.deleteGeneratedExampleForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
}

async function assertDictionaryReflectsRemainingExamples(
  context: DictionaryExamplesContext,
  page: any,
  testInfo: any,
  eyes: any,
  capturedValues: CapturedExampleValues,
) {
  const dictionaryPage = await generateDictionaryAndOpenIt(
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

  expect(dictionaryContent).not.toContain(capturedValues.deletedProductName);
  expect(dictionaryContent).toContain(`- ${capturedValues.retainedPageSize}`);
  expect(dictionaryContent).toContain(`- ${capturedValues.retainedQueryType}`);
}
