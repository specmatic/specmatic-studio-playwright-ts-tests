import { expect, test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY } from "../../specNames";

const PRODUCTS_PATH = "products";
const FIND_AVAILABLE_PRODUCTS_PATH = "findAvailableProducts";
const PRODUCT_CREATED_STATUS = 201;
const FIND_AVAILABLE_PRODUCTS_STATUS = 200;
const UPDATED_PRODUCT_NAME = "George";
const UPDATED_PAGE_SIZE = "876";
const UPDATED_QUERY_TYPE = "gadget";

interface DictionaryGenerateMoreContext {
  sourceSpecName: string;
  dictionarySpecName: string;
  sourceSpecPage: ServiceSpecConfigPage;
  examplePage: ExampleGenerationPage;
}

interface InitialGeneratedValues {
  productName: string;
  pageSize: string;
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

function extractAllJsonStringValues(content: string, key: string): string[] {
  return Array.from(
    content.matchAll(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "g")),
  ).map((match) => match[1]);
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

async function updateDictionaryThroughEditor(
  dictionaryPage: ServiceSpecConfigPage,
  initialValues: InitialGeneratedValues,
) {
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
}

async function openSpecFromSidebar(
  specPage: ServiceSpecConfigPage,
  specName: string,
) {
  await specPage.gotoHomeAndOpenSidebar();
  await specPage.sideBar.selectSpec(specName);
}

async function openSourceSpec(context: DictionaryGenerateMoreContext) {
  await openSpecFromSidebar(context.sourceSpecPage, context.sourceSpecName);
  await context.sourceSpecPage.openSpecTab();
}

async function openExamplesTab(
  context: DictionaryGenerateMoreContext,
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

async function openDictionarySpec(
  context: DictionaryGenerateMoreContext,
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

async function generateDictionaryAndOpenIt(
  context: DictionaryGenerateMoreContext,
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

  return openDictionarySpec(context, page, testInfo, eyes);
}

async function generateInitialExamples(
  context: DictionaryGenerateMoreContext,
  page: any,
  testInfo: any,
  eyes: any,
): Promise<InitialGeneratedValues> {
  await openExamplesTab(context, testInfo, eyes);
  await context.examplePage.deleteGeneratedExamples();

  await context.examplePage.generateExampleAndViewDetailsForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
  await takeAndAttachScreenshot(page, "initial-products-example-details", eyes);
  const initialProductsContent = await context.examplePage.getEditorContent();
  const initialProductName = extractJsonStringValue(
    initialProductsContent,
    "name",
  );
  expect(initialProductName).toBeTruthy();
  await context.examplePage.goBackFromExample();

  await context.examplePage.generateExampleAndViewDetailsForPath(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
  );
  await takeAndAttachScreenshot(
    page,
    "initial-find-available-products-example-details",
    eyes,
  );
  const initialFindAvailableProductsContent =
    await context.examplePage.getEditorContent();
  const initialPageSize = extractJsonStringValue(
    initialFindAvailableProductsContent,
    "pageSize",
  );
  expect(initialPageSize).toBeTruthy();
  await context.examplePage.goBackFromExample();

  return {
    productName: String(initialProductName),
    pageSize: String(initialPageSize),
  };
}

async function updateDictionaryAndSave(
  dictionaryPage: ServiceSpecConfigPage,
  initialValues: InitialGeneratedValues,
) {
  await updateDictionaryThroughEditor(dictionaryPage, initialValues);
  await dictionaryPage.clickSaveAfterEdit();
}

async function generateMoreProductsExampleAndAssertName(
  context: DictionaryGenerateMoreContext,
  page: any,
  eyes: any,
) {
  await context.examplePage.clickGenerateMoreButton(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
  await context.examplePage.clickViewDetails(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
    true,
    true,
  );
  await takeAndAttachScreenshot(
    page,
    "dictionary-generate-more-products-example-details",
    eyes,
  );

  const productExampleContent = await context.examplePage.getEditorContent();
  const updatedProductName = extractJsonStringValue(
    productExampleContent,
    "name",
  );

  expect(updatedProductName).toBe(UPDATED_PRODUCT_NAME);
  await context.examplePage.goBackFromExample();
}

async function generateMoreFindAvailableProductsExampleAndAssertValues(
  context: DictionaryGenerateMoreContext,
  page: any,
  eyes: any,
) {
  await context.examplePage.clickGenerateMoreButton(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
  );
  await context.examplePage.clickViewDetails(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
    true,
    true,
  );
  await takeAndAttachScreenshot(
    page,
    "dictionary-generate-more-find-available-products-example-details",
    eyes,
  );

  const rawEditorContent = await context.examplePage.getEditorContent();
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

      const sourceSpecName =
        PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY;
      const context: DictionaryGenerateMoreContext = {
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
      let initialGeneratedValues!: InitialGeneratedValues;

      await test.step("Generate initial examples for the endpoints before creating the dictionary", async () => {
        initialGeneratedValues = await generateInitialExamples(
          context,
          page,
          testInfo,
          eyes,
        );
      });

      await test.step("Generate dictionary and update request and response values", async () => {
        await openSourceSpec(context);
        const dictionaryPage = await generateDictionaryAndOpenIt(
          context,
          page,
          testInfo,
          eyes,
        );
        await updateDictionaryAndSave(dictionaryPage, initialGeneratedValues);
      });

      await test.step("Generate more /products 201 example and verify the updated name is used", async () => {
        await openExamplesTab(context, testInfo, eyes);
        await generateMoreProductsExampleAndAssertName(context, page, eyes);
      });

      await test.step("Generate more /findAvailableProducts 200 example and verify query, header, and response values", async () => {
        await openExamplesTab(context, testInfo, eyes, false);
        await generateMoreFindAvailableProductsExampleAndAssertValues(
          context,
          page,
          eyes,
        );
      });
    },
  );
});
