import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_2_PATHS } from "../../specNames";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { Page, TestInfo } from "@playwright/test";

test.describe("Example Generation", () => {
  test(
    `Generate examples for '/products' and '/monitor/(id:number)' paths of '${PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_2_PATHS}' for all response codes and methods`,
    { tag: ["@examples", "@multiplePathGeneration"] },
    async ({ page, eyes }, testInfo) => {
      console.log(`Starting test: ${testInfo.title}`);
      const examplePage = new ExampleGenerationPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_2_PATHS,
      );
      await examplePage.openExampleGenerationTabForSpec(
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_2_PATHS,
      );

      await examplePage.deleteGeneratedExamples();
      await examplePage.generateAndValidateForPaths([
        { path: "products", responseCodes: [201, 202, 400] },
        { path: "monitor/(id:number)", responseCodes: [200, 400] },
      ]);

      const numberOfExamplesValidated =
        await examplePage.getNumberOfExamplesValidated();

      expect(numberOfExamplesValidated).toBe(5);
    },
  );
});
