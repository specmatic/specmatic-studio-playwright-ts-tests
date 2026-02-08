import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";

test.describe("Example Generation", () => {

  test(
    "Generate examples for 'findAvailableProducts' endpoint of product_search_bff_v5.yaml for response codes 200, 400",
    { tag: ["@exampleGeneration", "@findAvailableProducts"] },
    async ({ page, eyes }, testInfo) => {
      const examplePage = new ExampleGenerationPage(page, testInfo, eyes);
      await examplePage.goto();
      await examplePage.ensureSidebarOpen();
      await examplePage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await examplePage.clickGenerateExamples();

      const endpoint = "findAvailableProducts";
      const responseCodes = [200, 400];

      for (const code of responseCodes) {
        await examplePage.clickGenerateButton(endpoint, code);
        await examplePage.verifyGenerateButtonNotVisible(endpoint, code);
        await examplePage.verifyExampleFileNameVisible(endpoint, code);
        await examplePage.verifyValidateButtonVisible(endpoint, code);
        await examplePage.clickViewDetails(endpoint, code);
        await examplePage.clickGoBack(endpoint, code);
        await examplePage.clickValidateButton(endpoint, code);
      }
    },
  );
});
