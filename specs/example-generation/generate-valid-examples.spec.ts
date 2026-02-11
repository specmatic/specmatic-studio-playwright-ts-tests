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
    `Generate examples for '/products' and '/monitor/(id:number)' paths of '${PRODUCT_SEARCH_BFF_SPEC}' for all response codes and methods`,
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

test(
  `Generate examples for ALL paths of '${PRODUCT_SEARCH_BFF_SPEC}' for all response codes and methods`,
  { tag: ["@exampleGeneration", "@allPathGeneration"] },
  async ({ page, eyes }, testInfo) => {
    const examplePage = new ExampleGenerationPage(page, testInfo, eyes);
    await examplePage.openExampleGenerationTabForSpec(
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC,
    );

    const expectedNumberOfExamples =
      await examplePage.getNumberOfPathMethodsAndResponses();

    await examplePage.deleteGeneratedExamples();

    const numberOfGenerateButtons =
      await examplePage.getNumberOfGenerateButtons();

    await examplePage.generateAllExamples();

    const numberOfExamplesGenerated =
      await examplePage.getNumberOfExamplesGenerated(); // get number of files generated from the UI after generation is complete

    const numberOfValidateButtons =
      await examplePage.getNumberOfValidateButtons();

    await examplePage.validateAllExamples();

    const numberOfExamplesValidated =
      await examplePage.getNumberOfExamplesValidated();

    expect.soft(numberOfGenerateButtons).toBe(numberOfValidateButtons);
    expect.soft(numberOfExamplesGenerated).toBe(expectedNumberOfExamples);
    expect.soft(numberOfExamplesValidated).toBe(expectedNumberOfExamples);
  },
);
});
