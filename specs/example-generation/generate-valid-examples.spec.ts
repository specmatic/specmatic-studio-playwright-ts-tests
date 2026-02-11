import { test, expect } from "../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";

test.describe("Example Generation", () => {
  test(
    `Generate examples for 'findAvailableProducts' endpoint of '${PRODUCT_SEARCH_BFF_SPEC}' for response codes 200, 400`,
    { tag: ["@exampleGeneration", "@findAvailableProducts"] },
    async ({ page, eyes }, testInfo) => {
      const examplePage = new ExampleGenerationPage(page, testInfo, eyes);
      await test.step(`Go to Example Generation page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
        await examplePage.gotoHomeAndOpenSidebar();
        await examplePage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
        await examplePage.openExampleGenerationTab();
      });

      const path = "findAvailableProducts";
      const responseCodes = [200, 400];

      for (const code of responseCodes) {
        await test.step(`Generate example and validate for path: '${path}' and response code: '${code}'`, async () => {
          await generateExample(examplePage, path, code);
          await verifyGeneratedExample(examplePage, path, code);
          await viewExampleDetailsAndReturn(examplePage, path, code);
          await validateExample(examplePage, path, code);
        });
      }
    },
  );
});

async function generateExample(examplePage: ExampleGenerationPage, path: string, code: number) {
  await test.step(`Generate example`, async () => {
    await examplePage.clickGenerateButton(path, code);
  });
}

async function validateExample(examplePage: ExampleGenerationPage, path: string, code: number) {
  await test.step(`Validate generated example`, async () => {
    await examplePage.clickValidateButton(path, code);
  });
}

async function viewExampleDetailsAndReturn(examplePage: ExampleGenerationPage, path: string, code: number) {
  await test.step(`View details and go back`, async () => {
    await examplePage.clickViewDetails(path, code);
    await examplePage.clickGoBack(path, code);
  });
}

async function verifyGeneratedExample(examplePage: ExampleGenerationPage, path: string, code: number) {
  await test.step(`Verify example is generated`, async () => {
    await examplePage.verifyGenerateButtonNotVisible(path, code);
    await examplePage.verifyExampleFileNameVisible(path, code);
    await examplePage.verifyValidateButtonVisible(path, code);
  });
}

