import { test, expect } from "../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";
import { Page, TestInfo } from "@playwright/test";

test.describe.serial("Inline examples", () => {
  test(
    `Inline an example for findAvailableProducts 200`,
    { tag: ["@exampleGeneration", "@inlineExamples", "@inlineExample"] },
    async ({ page, eyes }, testInfo) => {
      try {
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
          { path: "findAvailableProducts", responseCodes: [200] },
        ]);

        await examplePage.inlineExamples();

        const expectedUpdatedSpecName = PRODUCT_SEARCH_BFF_SPEC.replace(
          /.yaml$/,
          "-updated.yaml",
        );

        const [actualTitle, actualMessage] =
          await examplePage.getDialogTitleAndMessage();

        expect.soft(actualTitle).toBe("Examples Inline Complete");
        expect
          .soft(actualMessage)
          .toBe(
            `Successfully inlined examples into ${expectedUpdatedSpecName}`,
          );

        await examplePage.closeInlineSuccessDialog("Examples Inline Complete");
      } catch (err) {
        expect
          .soft(err, `Unexpected error in test: ${testInfo.title}`)
          .toBeUndefined();
      }
    },
  );

  test(
    `Inline all examples for '${PRODUCT_SEARCH_BFF_SPEC}'`,
    { tag: ["@exampleGeneration", "@inlineExamples", "@inlineAllExamples"] },
    async ({ page, eyes }, testInfo) => {
      try {
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

        await examplePage.generateAllExamples();
        await examplePage.validateAllExamples();
        await examplePage.inlineExamples();

        const expectedUpdatedSpecName = PRODUCT_SEARCH_BFF_SPEC.replace(
          /.yaml$/,
          "-updated.yaml",
        );

        const [actualTitle, actualMessage] =
          await examplePage.getDialogTitleAndMessage();

        expect.soft(actualTitle).toBe("Examples Inline Complete");
        expect
          .soft(actualMessage)
          .toBe(
            `Successfully inlined examples into ${expectedUpdatedSpecName}`,
          );

        await examplePage.closeInlineSuccessDialog("Examples Inline Complete");
      } catch (err) {
        expect
          .soft(err, `Unexpected error in test: ${testInfo.title}`)
          .toBeUndefined();
      }
    },
  );
});
