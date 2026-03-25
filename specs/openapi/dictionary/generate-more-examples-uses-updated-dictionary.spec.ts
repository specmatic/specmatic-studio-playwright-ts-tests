import { expect, test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY } from "../../specNames";

const PRODUCTS_PATH = "products";
const PRODUCT_CREATED_STATUS = 201;
const NEW_PRODUCT_NAME = "Name1";

interface DictionaryExampleContext {
  sourceSpecName: string;
  dictionarySpecName: string;
  examplePage: ExampleGenerationPage;
  sourceSpecPage: ServiceSpecConfigPage;
}

function getDictionarySpecName(specName: string): string {
  return specName.replace(/\.yaml$/, "_dictionary.yaml");
}

function shouldReloadBeforeOpeningDictionary(): boolean {
  return process.platform === "win32" || process.platform === "linux";
}

function addNewProductNameToDictionary(
  dictionaryContent: string,
  newName: string,
): string {
  const productNameBlockPattern =
    /(ProductBase:\r?\n\s+name:\r?\n(?:\s+-.*\r?\n)?)/;
  const updatedContent = dictionaryContent.replace(
    productNameBlockPattern,
    `$1  - ${newName}\n`,
  );

  if (updatedContent === dictionaryContent) {
    throw new Error(
      "Could not locate the ProductBase.name block in dictionary",
    );
  }

  return updatedContent;
}

function parseExampleJson(exampleContent: string): any {
  try {
    return JSON.parse(exampleContent);
  } catch (error) {
    throw new Error(`Generated example content is not valid JSON: ${error}`);
  }
}

function getExampleRequestBody(exampleJson: any): Record<string, unknown> {
  const requestBody =
    exampleJson?.["http-request"]?.body ??
    exampleJson?.request?.body ??
    exampleJson?.body;

  if (!requestBody || typeof requestBody !== "object") {
    throw new Error(
      `Could not find a JSON request body in generated example: ${JSON.stringify(exampleJson, null, 2)}`,
    );
  }

  return requestBody as Record<string, unknown>;
}

async function openSpecFromSidebar(
  specPage: ServiceSpecConfigPage,
  specName: string,
) {
  await specPage.gotoHomeAndOpenSidebar();
  await specPage.sideBar.selectSpec(specName);
}

async function openSourceSpec(context: DictionaryExampleContext) {
  await openSpecFromSidebar(context.sourceSpecPage, context.sourceSpecName);
  await context.sourceSpecPage.openSpecTab();
}

async function openDictionarySpec(
  context: DictionaryExampleContext,
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

async function generateInitialExample(context: DictionaryExampleContext) {
  await context.examplePage.deleteGeneratedExamples();
  await context.examplePage.generateExampleAndViewDetailsForPath(
    PRODUCTS_PATH,
    PRODUCT_CREATED_STATUS,
  );
  await context.examplePage.goBackFromExample();
}

async function generateDictionaryAndOpenIt(
  context: DictionaryExampleContext,
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

async function updateDictionaryAndSave(
  dictionaryPage: ServiceSpecConfigPage,
  newName: string,
) {
  const originalDictionaryContent =
    await dictionaryPage.getEditorDocumentText();
  const updatedDictionaryContent = addNewProductNameToDictionary(
    originalDictionaryContent,
    newName,
  );

  await dictionaryPage.replaceEditorDocumentText(updatedDictionaryContent);
  await dictionaryPage.clickSaveAfterEdit();
}

async function generateMoreAndOpenLatestExample(
  context: DictionaryExampleContext,
  testInfo: any,
  eyes: any,
) {
  await context.examplePage.openExampleGenerationTabForSpec(
    testInfo,
    eyes,
    context.sourceSpecName,
  );
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

  return context.examplePage.getEditorContent();
}

test.describe("Generate More Examples With Updated Dictionary", () => {
  test(
    "Generate more examples uses the updated dictionary values",
    { tag: ["@spec", "@generateDictionaryWithGeneratedExamples", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const sourceSpecName =
        PRODUCT_SEARCH_BFF_SPEC_GENERATE_MORE_FROM_DICTIONARY;
      const context: DictionaryExampleContext = {
        sourceSpecName,
        dictionarySpecName: getDictionarySpecName(sourceSpecName),
        examplePage: new ExampleGenerationPage(
          page,
          testInfo,
          eyes,
          sourceSpecName,
        ),
        sourceSpecPage: new ServiceSpecConfigPage(
          page,
          testInfo,
          eyes,
          sourceSpecName,
        ),
      };

      await test.step("Generate the first example for /products 201", async () => {
        await context.examplePage.openExampleGenerationTabForSpec(
          testInfo,
          eyes,
          context.sourceSpecName,
        );
        await generateInitialExample(context);
      });

      await test.step("Generate the dictionary, add a new product name, and save it", async () => {
        await openSourceSpec(context);
        const dictionaryPage = await generateDictionaryAndOpenIt(
          context,
          page,
          testInfo,
          eyes,
        );
        await updateDictionaryAndSave(dictionaryPage, NEW_PRODUCT_NAME);
      });

      await test.step("Generate more examples and verify the new name is used", async () => {
        const latestExampleContent = await generateMoreAndOpenLatestExample(
          context,
          testInfo,
          eyes,
        );
        const latestExample = parseExampleJson(latestExampleContent);
        const requestBody = getExampleRequestBody(latestExample);

        expect(requestBody.name).toBe(NEW_PRODUCT_NAME);
        expect(requestBody.type).toBe("book");
        expect(requestBody.inventory).toBe(4);
      });
    },
  );
});
