import { test, expect } from "../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";

test.describe("Example Generation", () => {
  test(
    "Generate examples for 'findAvailableProducts' endpoint of product_search_bff_v5.yaml for response codes 200, 400",
    { tag: ["@exampleGeneration", "@findAvailableProducts"] },
    async ({ page, eyes }, testInfo) => {
      const examplePage = new ExampleGenerationPage(page, testInfo, eyes);
      await test.step(`Go to Example Generation page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
        await examplePage.gotoHomeAndOpenSidebar();
        await examplePage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
        await examplePage.openExampleGenerationTab();
      });

      const endpoint = "findAvailableProducts";
      const responseCodes = [200, 400];

      for (const code of responseCodes) {
        await test.step(`Generate example and validate for endpoint: '${endpoint}' and response code: '${code}'`, async () => {
          await test.step(`Generate example`, async () => {
            await examplePage.clickGenerateButton(endpoint, code);
          });
          await test.step(`Verify example is generated`, async () => {
            await examplePage.verifyGenerateButtonNotVisible(endpoint, code);
            await examplePage.verifyExampleFileNameVisible(endpoint, code);
            await examplePage.verifyValidateButtonVisible(endpoint, code);
          });
          await test.step(`View details and go back`, async () => {
            await examplePage.clickViewDetails(endpoint, code);
            await examplePage.clickGoBack(endpoint, code);
          });
          await test.step(`Validate generated example`, async () => {
            await examplePage.clickValidateButton(endpoint, code);
          });
        });
      }
    },
  );
});
