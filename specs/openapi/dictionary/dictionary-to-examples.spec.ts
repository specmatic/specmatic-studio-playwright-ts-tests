import { expect, test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC_DICTIONARY_TO_EXAMPLES } from "../../specNames";

const PRODUCTS_PATH = "products";
const FIND_AVAILABLE_PRODUCTS_PATH = "findAvailableProducts";
const PRODUCT_CREATED_STATUS = 201;
const FIND_AVAILABLE_PRODUCTS_STATUS = 200;
const UPDATED_PRODUCT_NAME = "George";
const UPDATED_PAGE_SIZE = "876";
const UPDATED_QUERY_TYPE = "gadget";

interface DictionaryExamplesContext {
  sourceSpecName: string;
  dictionarySpecName: string;
  sourceSpecPage: ServiceSpecConfigPage;
  examplePage: ExampleGenerationPage;
}

function getDictionarySpecName(specName: string): string {
  return specName.replace(/\.yaml$/, "_dictionary.yaml");
}

function shouldReloadBeforeOpeningDictionary(): boolean {
  return process.platform === "win32" || process.platform === "linux";
}

function parseJson(content: string): any {
  try {
    return JSON.parse(content);
  } catch (error) {
    try {
      return Function(`"use strict"; return (${content});`)();
    } catch {
      const preview = content.slice(0, 1500);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Could not parse generated example content. Parse error: ${errorMessage}\nContent preview:\n${preview}`,
      );
    }
  }
}

function extractJsonStringValue(content: string, key: string): string | undefined {
  const match = content.match(
    new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`),
  );
  return match?.[1];
}

function extractAllJsonStringValues(content: string, key: string): string[] {
  return Array.from(
    content.matchAll(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "g")),
  ).map((match) => match[1]);
}

function extractPageSizeValues(dictionaryContent: string): string[] {
  const match = dictionaryContent.match(
    /pageSize:\s*\r?\n((?:[ \t]*- .*?\r?\n)+)/,
  );
  if (!match) {
    throw new Error(
      `Could not find pageSize values in the dictionary content.\nContent preview:\n${dictionaryContent.slice(0, 1500)}`,
    );
  }

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim());
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
) {
  const dictionaryContent = await waitForDictionarySections(dictionaryPage);
  const pageSizeValues = extractPageSizeValues(dictionaryContent);

  if (pageSizeValues.length < 2) {
    throw new Error(
      `Expected at least 2 pageSize values in the dictionary, found ${pageSizeValues.length}`,
    );
  }

  await dictionaryPage.editSpecInEditor("- null", `- ${UPDATED_PRODUCT_NAME}`);
  await dictionaryPage.editSpecInEditor(
    `- ${pageSizeValues[0]}`,
    `- ${UPDATED_PAGE_SIZE}`,
  );
  await dictionaryPage.deleteSpecLinesInEditor(`- ${pageSizeValues[1]}`);
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

async function openSourceSpec(context: DictionaryExamplesContext) {
  await openSpecFromSidebar(context.sourceSpecPage, context.sourceSpecName);
  await context.sourceSpecPage.openSpecTab();
}

async function openDictionarySpec(
  context: DictionaryExamplesContext,
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
  context: DictionaryExamplesContext,
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

async function updateDictionaryAndSave(dictionaryPage: ServiceSpecConfigPage) {
  await updateDictionaryThroughEditor(dictionaryPage);
  await dictionaryPage.clickSaveAfterEdit();
}

async function openExamplesTab(
  context: DictionaryExamplesContext,
  testInfo: any,
  eyes: any,
  reopenFromSidebar: boolean = true,
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

async function generateProductsExampleAndAssertName(
  context: DictionaryExamplesContext,
  page: any,
  testInfo: any,
  eyes: any,
) {
  await openExamplesTab(context, testInfo, eyes);
  await context.examplePage.deleteGeneratedExamples();
  await context.examplePage.generateExampleAndViewDetailsForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
  await takeAndAttachScreenshot(
    page,
    "dictionary-products-example-details",
    eyes,
  );

  const productExample = parseJson(
    await context.examplePage.getEditorContent(),
  );
  const requestBody = productExample?.["http-request"]?.body;

  expect(requestBody?.name).toBe(UPDATED_PRODUCT_NAME);
  await context.examplePage.goBackFromExample();
}

async function generateFindAvailableProductsExampleAndAssertDictionaryValues(
  context: DictionaryExamplesContext,
  page: any,
  eyes: any,
) {
  await context.examplePage.generateExampleAndViewDetailsForPath(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
  );
  await takeAndAttachScreenshot(
    page,
    "dictionary-find-available-products-example-details",
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
    `Expected every rendered "type" value in the generated example to come from the updated dictionary, but got: ${renderedTypeValues.join(", ")}`,
  ).toEqual(renderedTypeValues.map(() => UPDATED_QUERY_TYPE));

  const endpointExample = parseJson(rawEditorContent);
  const response = endpointExample?.["http-response"];
  const responseBody = Array.isArray(response?.body) ? response.body : [];
  expect(responseBody.length).toBeGreaterThan(0);
}

test.describe("Dictionary To Examples", () => {
  test(
    "Generated examples pick request and response values from the updated dictionary",
    {
      tag: [
        "@spec",
        "@generateExamplesFromDictionary",
        "@eyes",
        "@expected-failure",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      test.fail(
        true,
        "Enum values are not picked in http-response of examples generated with the help of dictionary",
      );
      const sourceSpecName = PRODUCT_SEARCH_BFF_SPEC_DICTIONARY_TO_EXAMPLES;
      const context: DictionaryExamplesContext = {
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

      await test.step("Generate dictionary first without generating any examples", async () => {
        await openSourceSpec(context);
        const dictionaryPage = await generateDictionaryAndOpenIt(
          context,
          page,
          testInfo,
          eyes,
        );
        await updateDictionaryAndSave(dictionaryPage);
      });

      await test.step("Generate /products 201 example and verify the updated name is used", async () => {
        await generateProductsExampleAndAssertName(
          context,
          page,
          testInfo,
          eyes,
        );
      });

      await test.step("Generate /findAvailableProducts 200 example and verify query, header, and response values", async () => {
        await openExamplesTab(context, testInfo, eyes, false);
        await generateFindAvailableProductsExampleAndAssertDictionaryValues(
          context,
          page,
          eyes,
        );
      });
    },
  );
});
