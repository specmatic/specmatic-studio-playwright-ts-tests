import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../../specNames";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { Page, TestInfo } from "@playwright/test";

test.describe("Example Generation", () => {
  test(
    `Generate examples for 'findAvailableProducts' endpoint of '${PRODUCT_SEARCH_BFF_SPEC}' for response codes 200, 400`,
    { tag: ["@examples", "@singlePathGeneration"] },
    async ({ page, eyes }, testInfo) => {
      console.log(`Starting test: ${testInfo.title}`);
      const examplePage = new ExampleGenerationPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
      );
      await examplePage.openExampleGenerationTabForSpec(
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
      );

      await examplePage.deleteGeneratedExamples();

      await examplePage.generateAndValidateForPaths([
        { path: "findAvailableProducts", responseCodes: [200, 400] },
      ]);

      const numberOfExamplesValidated =
        await examplePage.getNumberOfExamplesValidated();

      expect(numberOfExamplesValidated).toBe(2);
    },
  );
});
