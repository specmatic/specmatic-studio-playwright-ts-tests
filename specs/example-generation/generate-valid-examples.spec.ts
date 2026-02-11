import { test, expect } from "../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";
import { Page, TestInfo } from "@playwright/test";

test.describe.serial("Example Generation", () => {
  test(
    `Generate examples for 'findAvailableProducts' endpoint of '${PRODUCT_SEARCH_BFF_SPEC}' for response codes 200, 400`,
    { tag: ["@exampleGeneration", "@singlePathGeneration"] },
    async ({ page, eyes }, testInfo) => {
      const examplePage = new ExampleGenerationPage(page, testInfo, eyes);
      await examplePage.openExampleGenerationTabForSpec(
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
      );

      await examplePage.deleteGeneratedExamples();

      await examplePage.generateAndValidateForPaths([
        { path: "findAvailableProducts", responseCodes: [200, 400] },
      ]);
    },
  );

  test(
    `Generate examples for '/products' and '/monitor/(id:number)' endpoints of '${PRODUCT_SEARCH_BFF_SPEC}' for all response codes and methods`,
    { tag: ["@exampleGeneration", "@multiplePathGeneration"] },
    async ({ page, eyes }, testInfo) => {
      const examplePage = new ExampleGenerationPage(page, testInfo, eyes);
      await examplePage.openExampleGenerationTabForSpec(
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
      );

      await examplePage.deleteGeneratedExamples();
      await examplePage.generateAndValidateForPaths([
        { path: "products", responseCodes: [201, 202, 400] },
        { path: "monitor/(id:number)", responseCodes: [200, 400] },
      ]);
    },
  );
});
