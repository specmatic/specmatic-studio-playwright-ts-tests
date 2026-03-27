import { Page, TestInfo } from "@playwright/test";
import { expect, test } from "../../../utils/eyesFixture";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC_DICTIONARY_TO_EXAMPLES } from "../../specNames";
import {
  createDictionaryExamplesContext,
  extractAllJsonStringValues,
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
const UPDATED_PRODUCT_NAME = "George";
const UPDATED_PAGE_SIZE = "876";
const UPDATED_QUERY_TYPE = "gadget";

interface DictionaryExamplesFlow {
  page: Page;
  eyes: any;
  testInfo: TestInfo;
  context: DictionaryExamplesContext;
}

function createFlow(
  page: Page,
  testInfo: TestInfo,
  eyes: any,
): DictionaryExamplesFlow {
  return {
    page,
    eyes,
    testInfo,
    context: createDictionaryExamplesContext(
      page,
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC_DICTIONARY_TO_EXAMPLES,
    ),
  };
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

async function updateDictionaryAndSave(dictionaryPage: ServiceSpecConfigPage) {
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
  await dictionaryPage.clickSaveAfterEdit();
}

async function generateDictionaryWithUpdatedValues(flow: DictionaryExamplesFlow) {
  await openSourceSpec(flow.context);
  const dictionaryPage = await generateDictionaryAndOpenIt(
    flow.context,
    flow.page,
    flow.testInfo,
    flow.eyes,
  );
  await updateDictionaryAndSave(dictionaryPage);
}

async function assertProductsExampleUsesUpdatedName(flow: DictionaryExamplesFlow) {
  await openExamplesTab(flow.context, flow.testInfo, flow.eyes);
  await flow.context.examplePage.deleteGeneratedExamples();
  await flow.context.examplePage.generateExampleAndViewDetailsForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
  await takeAndAttachScreenshot(
    flow.page,
    "dictionary-products-example-details",
    flow.eyes,
  );

  const productExample = parseJson(
    await flow.context.examplePage.getEditorContent(),
  );
  expect(productExample?.["http-request"]?.body?.name).toBe(
    UPDATED_PRODUCT_NAME,
  );
  await flow.context.examplePage.goBackFromExample();
}

async function assertFindAvailableProductsExampleUsesUpdatedValues(
  flow: DictionaryExamplesFlow,
) {
  await openExamplesTab(flow.context, flow.testInfo, flow.eyes, false);
  await flow.context.examplePage.generateExampleAndViewDetailsForPath(
    FIND_AVAILABLE_PRODUCTS_PATH,
    FIND_AVAILABLE_PRODUCTS_STATUS,
  );
  await takeAndAttachScreenshot(
    flow.page,
    "dictionary-find-available-products-example-details",
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
    `Expected every rendered "type" value in the generated example to come from the updated dictionary, but got: ${renderedTypeValues.join(", ")}`,
  ).toEqual(renderedTypeValues.map(() => UPDATED_QUERY_TYPE));

  const endpointExample = parseJson(rawEditorContent);
  expect(Array.isArray(endpointExample?.["http-response"]?.body)).toBe(true);
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
      const flow = createFlow(page, testInfo, eyes);

      await test.step(
        "Generate dictionary first without generating any examples",
        async () => {
          await generateDictionaryWithUpdatedValues(flow);
        },
      );

      await test.step(
        "Generate /products 201 example and verify the updated name is used",
        async () => {
          await assertProductsExampleUsesUpdatedName(flow);
        },
      );

      await test.step(
        "Generate /findAvailableProducts 200 example and verify query, header, and response values",
        async () => {
          await assertFindAvailableProductsExampleUsesUpdatedValues(flow);
        },
      );
    },
  );
});
