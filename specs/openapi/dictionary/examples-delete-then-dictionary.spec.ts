import { Page, TestInfo } from "@playwright/test";
import { expect, test } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY } from "../../specNames";
import {
  createDictionaryExamplesContext,
  extractJsonStringValue,
  generateDictionaryAndOpenIt,
  openExamplesTab,
  openSourceSpec,
  type DictionaryExamplesContext,
} from "./dictionary-test-utils";

const PRODUCTS_PATH = "products";
const FIND_AVAILABLE_PRODUCTS_PATH = "findAvailableProducts";
const PRODUCT_CREATED_STATUS = 201;
const FIND_AVAILABLE_PRODUCTS_STATUS = 200;

interface CapturedExampleValues {
  deletedProductName: string;
  retainedPageSize: string;
  retainedQueryType: string;
}

interface DeleteThenDictionaryFlow {
  page: Page;
  eyes: any;
  testInfo: TestInfo;
  context: DictionaryExamplesContext;
}

function createFlow(
  page: Page,
  testInfo: TestInfo,
  eyes: any,
): DeleteThenDictionaryFlow {
  return {
    page,
    eyes,
    testInfo,
    context: createDictionaryExamplesContext(
      page,
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY,
    ),
  };
}

async function captureInitialExampleValues(
  flow: DeleteThenDictionaryFlow,
): Promise<CapturedExampleValues> {
  await openExamplesTab(flow.context, flow.testInfo, flow.eyes);
  await flow.context.examplePage.deleteGeneratedExamples();

  await flow.context.examplePage.generateExampleAndViewDetailsForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
  await takeAndAttachScreenshot(
    flow.page,
    "delete-flow-products-example",
    flow.eyes,
  );
  const productsContent = await flow.context.examplePage.getEditorContent();
  const deletedProductName = extractJsonStringValue(productsContent, "name");
  expect(deletedProductName).toBeTruthy();
  await flow.context.examplePage.goBackFromExample();

  await flow.context.examplePage.generateExampleAndViewDetailsForPath(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
  );
  await takeAndAttachScreenshot(
    flow.page,
    "delete-flow-find-available-products-example",
    flow.eyes,
  );
  const findAvailableProductsContent =
    await flow.context.examplePage.getEditorContent();
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
  await flow.context.examplePage.goBackFromExample();

  return {
    deletedProductName: String(deletedProductName),
    retainedPageSize: String(retainedPageSize),
    retainedQueryType: String(retainedQueryType),
  };
}

async function deleteOneGeneratedExample(flow: DeleteThenDictionaryFlow) {
  await openExamplesTab(flow.context, flow.testInfo, flow.eyes, false);
  await flow.context.examplePage.deleteGeneratedExampleForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
}

async function assertDictionaryReflectsRemainingExamples(
  flow: DeleteThenDictionaryFlow,
  capturedValues: CapturedExampleValues,
) {
  await openSourceSpec(flow.context);
  const dictionaryPage = await generateDictionaryAndOpenIt(
    flow.context,
    flow.page,
    flow.testInfo,
    flow.eyes,
  );
  const dictionaryContent = await dictionaryPage.getEditorDocumentText();
  await takeAndAttachScreenshot(
    flow.page,
    "dictionary-after-example-deletion",
    flow.eyes,
  );

  expect(dictionaryContent).not.toContain(capturedValues.deletedProductName);
  expect(dictionaryContent).toContain(`- ${capturedValues.retainedPageSize}`);
  expect(dictionaryContent).toContain(`- ${capturedValues.retainedQueryType}`);
}

test.describe("Examples Delete Then Dictionary", () => {
  test(
    "Generate examples, delete one example, then generate dictionary from the remaining examples",
    {
      tag: ["@spec", "@generateDictionaryWithDeletedExamples", "@eyes"],
    },
    async ({ page, eyes }, testInfo) => {
      const flow = createFlow(page, testInfo, eyes);
      let capturedValues!: CapturedExampleValues;

      await test.step(
        "Generate examples for multiple endpoints and capture the values to validate later",
        async () => {
          capturedValues = await captureInitialExampleValues(flow);
        },
      );

      await test.step("Delete one generated example", async () => {
        await deleteOneGeneratedExample(flow);
      });

      await test.step(
        "Generate dictionary and validate it reflects the remaining examples",
        async () => {
          await assertDictionaryReflectsRemainingExamples(
            flow,
            capturedValues,
          );
        },
      );
    },
  );
});
