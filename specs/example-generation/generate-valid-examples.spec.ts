import { test, expect } from "../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";
import { Page, TestInfo } from "@playwright/test";

test.describe.serial("Example Generation", () => {
  test(
    `Generate examples for 'findAvailableProducts' endpoint of '${PRODUCT_SEARCH_BFF_SPEC}' for response codes 200, 400`,
    { tag: ["@exampleGeneration", "@singlePathGeneration"] },
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

  test(
    `Generate examples for '/products' and '/monitor/(id:number)' paths of '${PRODUCT_SEARCH_BFF_SPEC}' for all response codes and methods`,
    { tag: ["@exampleGeneration", "@multiplePathGeneration"] },
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
        { path: "products", responseCodes: [201, 202, 400] },
        { path: "monitor/(id:number)", responseCodes: [200, 400] },
      ]);

      const numberOfExamplesValidated =
        await examplePage.getNumberOfExamplesValidated();

      expect(numberOfExamplesValidated).toBe(5);
    },
  );

  test(
    `Generate examples for ALL paths of '${PRODUCT_SEARCH_BFF_SPEC}' for all response codes and methods`,
    { tag: ["@exampleGeneration", "@allPathGeneration"] },
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

      let expectedNumberOfExamples: number = 11;
      let expectedNumberOfPathsAndResponseCodes: number = 0;
      let numberOfGenerateButtons: number = 0;
      let numberOfExamplesGenerated: number = 0;
      let numberOfValidateButtons: number = 0;
      let numberOfExamplesValidated: number = 0;

      await test.step(`Generate all examples and get number of paths and responses in the spec`, async () => {
        expectedNumberOfPathsAndResponseCodes =
          await examplePage.getNumberOfPathMethodsAndResponses();
        expect
          .soft(expectedNumberOfPathsAndResponseCodes)
          .toBe(expectedNumberOfExamples);
        numberOfGenerateButtons =
          await examplePage.getNumberOfGenerateButtons();
        await examplePage.generateAllExamples();
        const [actualTitle, actualMessage] =
          await examplePage.getDialogTitleAndMessage();
        expect.soft(actualTitle).toBe("Example Generations Complete");
        expect
          .soft(actualMessage)
          .toBe(`${expectedNumberOfExamples} new examples`);
      });

      await test.step(`Validate all generated examples and get counts`, async () => {
        numberOfExamplesGenerated =
          await examplePage.getNumberOfExamplesGenerated();
        numberOfValidateButtons =
          await examplePage.getNumberOfValidateButtons();
        await examplePage.validateAllExamples();
        numberOfExamplesValidated =
          await examplePage.getNumberOfExamplesValidated();

        expect.soft(numberOfGenerateButtons).toBe(numberOfValidateButtons);
        expect
          .soft(numberOfExamplesGenerated)
          .toBe(expectedNumberOfPathsAndResponseCodes);
        expect
          .soft(numberOfExamplesValidated)
          .toBe(expectedNumberOfPathsAndResponseCodes);
      });
    },
  );
});
