import { Page, TestInfo } from "@playwright/test";
import { expect, test } from "../../../utils/eyesFixture";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY } from "../../specNames";
import {
  createDictionaryExamplesContext,
  extractAllJsonStringValues,
  extractJsonStringValue,
  generateDictionaryAndOpenIt,
  openExamplesTab,
  type DictionaryExamplesContext,
} from "./dictionary-test-utils";

const PRODUCTS_PATH = "products";
const FIND_AVAILABLE_PRODUCTS_PATH = "findAvailableProducts";
const PRODUCT_CREATED_STATUS = 201;
const FIND_AVAILABLE_PRODUCTS_STATUS = 200;
const UPDATED_PRODUCT_NAME = "George";
const UPDATED_PAGE_SIZE = "876";
const UPDATED_QUERY_TYPE = "gadget";

interface InitialGeneratedValues {
  productName: string;
  pageSize: string;
}

interface GenerateMoreFlow {
  page: Page;
  eyes: any;
  testInfo: TestInfo;
  context: DictionaryExamplesContext;
}

function createFlow(
  page: Page,
  testInfo: TestInfo,
  eyes: any,
): GenerateMoreFlow {
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

async function waitForDictionarySections(
  dictionaryPage: ServiceSpecConfigPage,
): Promise<string> {
  let loadedContent = "";

  await expect
    .poll(
      async () => {
        loadedContent = await dictionaryPage.getEditorDocumentText();
        return (
          loadedContent.includes("ProductBase:") &&
          loadedContent.includes("pageSize:") &&
          loadedContent.includes("QUERY:") &&
          loadedContent.includes("type:")
        );
      },
      {
        timeout: 15000,
        intervals: [300, 600, 1000],
        message:
          "Dictionary editor did not fully load the sections needed for editing",
      },
    )
    .toBe(true);

  return loadedContent;
}

async function generateInitialExamples(
  flow: GenerateMoreFlow,
): Promise<InitialGeneratedValues> {
  await openExamplesTab(flow.context, flow.testInfo, flow.eyes);
  await flow.context.examplePage.deleteGeneratedExamples();

  await flow.context.examplePage.generateExampleAndViewDetailsForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
  await takeAndAttachScreenshot(
    flow.page,
    "initial-products-example-details",
    flow.eyes,
  );
  const initialProductsContent = await flow.context.examplePage.getEditorContent();
  const initialProductName = extractJsonStringValue(
    initialProductsContent,
    "name",
  );
  expect(initialProductName).toBeTruthy();
  await flow.context.examplePage.goBackFromExample();

  await flow.context.examplePage.generateExampleAndViewDetailsForPath(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
  );
  await takeAndAttachScreenshot(
    flow.page,
    "initial-find-available-products-example-details",
    flow.eyes,
  );
  const initialFindAvailableProductsContent =
    await flow.context.examplePage.getEditorContent();
  const initialPageSize = extractJsonStringValue(
    initialFindAvailableProductsContent,
    "pageSize",
  );
  expect(initialPageSize).toBeTruthy();
  await flow.context.examplePage.goBackFromExample();

  return {
    productName: String(initialProductName),
    pageSize: String(initialPageSize),
  };
}

async function generateDictionaryAndUpdateValues(
  flow: GenerateMoreFlow,
  initialValues: InitialGeneratedValues,
) {
  const dictionaryPage = await generateDictionaryAndOpenIt(
    flow.context,
    flow.page,
    flow.testInfo,
    flow.eyes,
  );
  const dictionaryContent = await waitForDictionarySections(dictionaryPage);

  expect(dictionaryContent).toContain(`- ${initialValues.productName}`);
  expect(dictionaryContent).toContain(`- ${initialValues.pageSize}`);

  await dictionaryPage.editSpecInEditor(
    `- ${initialValues.productName}`,
    `- ${UPDATED_PRODUCT_NAME}`,
  );
  await dictionaryPage.editSpecInEditor(
    `- ${initialValues.pageSize}`,
    `- ${UPDATED_PAGE_SIZE}`,
  );
  await dictionaryPage.editSpecInEditorByOccurrence(
    "- book",
    `- ${UPDATED_QUERY_TYPE}`,
    1,
  );
  await dictionaryPage.clickSaveAfterEdit();
}

async function assertGenerateMoreProductsExampleUsesUpdatedName(
  flow: GenerateMoreFlow,
) {
  await openExamplesTab(flow.context, flow.testInfo, flow.eyes);
  await flow.context.examplePage.clickGenerateMoreButton(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
  await flow.context.examplePage.clickViewDetails(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
    true,
    true,
  );
  await takeAndAttachScreenshot(
    flow.page,
    "dictionary-generate-more-products-example-details",
    flow.eyes,
  );

  const productExampleContent = await flow.context.examplePage.getEditorContent();
  const updatedProductName = extractJsonStringValue(productExampleContent, "name");
  expect(updatedProductName).toBe(UPDATED_PRODUCT_NAME);
  await flow.context.examplePage.goBackFromExample();
}

async function assertGenerateMoreFindAvailableProductsExampleUsesUpdatedValues(
  flow: GenerateMoreFlow,
) {
  await openExamplesTab(flow.context, flow.testInfo, flow.eyes, false);
  await flow.context.examplePage.clickGenerateMoreButton(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
  );
  await flow.context.examplePage.clickViewDetails(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
    true,
    true,
  );
  await takeAndAttachScreenshot(
    flow.page,
    "dictionary-generate-more-find-available-products-example-details",
    flow.eyes,
  );

  const rawEditorContent = await flow.context.examplePage.getEditorContent();
  const requestTypeValue = extractJsonStringValue(rawEditorContent, "type");
  const pageSizeValue = extractJsonStringValue(rawEditorContent, "pageSize");
  const renderedTypeValues = extractAllJsonStringValues(
    rawEditorContent,
    "type",
  );

  expect(requestTypeValue).toBe(UPDATED_QUERY_TYPE);
  expect(pageSizeValue).toBe(UPDATED_PAGE_SIZE);
  expect(renderedTypeValues.length).toBeGreaterThan(0);
  expect(
    renderedTypeValues,
    `Expected every rendered "type" value in the newly generated example to come from the updated dictionary, but got: ${renderedTypeValues.join(", ")}`,
  ).toEqual(renderedTypeValues.map(() => UPDATED_QUERY_TYPE));
  expect(rawEditorContent).toContain('"http-response"');
  expect(rawEditorContent).toContain('"body"');
}

test.describe("Examples Dictionary Generate More", () => {
  test(
    "Generate more examples after updating the dictionary and use the updated request and response values",
    {
      tag: [
        "@spec",
        "@generateMoreExamplesFromDictionary",
        "@eyes",
        "@expected-failure",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      test.fail(
        true,
        "Enum values are not picked in http-response of examples generated with the help of dictionary",
      );
      const flow = createFlow(page, testInfo, eyes);
      let initialGeneratedValues!: InitialGeneratedValues;

      await test.step(
        "Generate initial examples for the endpoints before creating the dictionary",
        async () => {
          initialGeneratedValues = await generateInitialExamples(flow);
        },
      );

      await test.step(
        "Generate dictionary and update request and response values",
        async () => {
          await generateDictionaryAndUpdateValues(flow, initialGeneratedValues);
        },
      );

      await test.step(
        "Generate more /products 201 example and verify the updated name is used",
        async () => {
          await assertGenerateMoreProductsExampleUsesUpdatedName(flow);
        },
      );

      await test.step(
        "Generate more /findAvailableProducts 200 example and verify query, header, and response values",
        async () => {
          await assertGenerateMoreFindAvailableProductsExampleUsesUpdatedValues(
            flow,
          );
        },
      );
    },
  );
});
