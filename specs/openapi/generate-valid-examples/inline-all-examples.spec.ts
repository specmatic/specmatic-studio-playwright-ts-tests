import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL } from "../../specNames";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { Page, TestInfo } from "@playwright/test";

test.describe("Inline examples", () => {
  test(
    `Inline all examples for '${PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL}'`,
    { tag: ["@examples", "@inlineExamples", "@inlineAllExamples", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      try {
        console.log(`Starting test: ${testInfo.title}`);
        const examplePage = new ExampleGenerationPage(
          page,
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL,
        );
        await examplePage.openExampleGenerationTabForSpec(
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL,
        );

        await examplePage.deleteGeneratedExamples();

        await examplePage.generateAllExamples();
        await examplePage.closeExamplesGenerationCompletedDialog(
          "Example Generations Complete",
        );
        await examplePage.validateAllExamples();
        await examplePage.inlineExamples();

        const expectedUpdatedSpecName =
          PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL.replace(
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
