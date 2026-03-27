import { expect, test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
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

function collectAllTypeValues(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((item) => collectAllTypeValues(item));
  }

  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    const currentType = typeof record.type === "string" ? [record.type] : [];

    return [
      ...currentType,
      ...Object.values(record).flatMap((value) => collectAllTypeValues(value)),
    ];
  }

  return [];
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
  testInfo: any,
  eyes: any,
) {
  await openExamplesTab(context, testInfo, eyes);
  await context.examplePage.deleteGeneratedExamples();
  await context.examplePage.generateExampleAndViewDetailsForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
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
) {
  await context.examplePage.generateExampleAndViewDetailsForPath(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
  );

  const endpointExample = parseJson(
    await context.examplePage.getEditorContent(),
  );
  const request = endpointExample?.["http-request"];
  const response = endpointExample?.["http-response"];
  const responseBody = Array.isArray(response?.body) ? response.body : [];
  const renderedTypeValues = collectAllTypeValues(endpointExample);

  expect(request?.query?.type).toBe(UPDATED_QUERY_TYPE);
  expect(request?.headers?.pageSize).toBe(UPDATED_PAGE_SIZE);
  expect(renderedTypeValues.length).toBeGreaterThan(0);
  expect(renderedTypeValues).toEqual(
    renderedTypeValues.map(() => UPDATED_QUERY_TYPE),
  );
  expect(responseBody.length).toBeGreaterThan(0);
}

test.describe("Dictionary To Examples", () => {
  test(
    "Generated examples pick request and response values from the updated dictionary",
    { tag: ["@spec", "@generateExamplesFromDictionary", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
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
        await generateProductsExampleAndAssertName(context, testInfo, eyes);
      });

      await test.step("Generate /findAvailableProducts 200 example and verify query, header, and response values", async () => {
        await openExamplesTab(context, testInfo, eyes, false);
        await generateFindAvailableProductsExampleAndAssertDictionaryValues(
          context,
        );
      });
    },
  );
});
