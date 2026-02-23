import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_1 } from "../../specNames";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { Page, TestInfo } from "@playwright/test";

test.describe("Inline examples", () => {
  test(
    `Inline an example for findAvailableProducts 200`,
    { tag: ["@examples", "@inlineExamples", "@inline1Example"] },
    async ({ page, eyes }, testInfo) => {
      try {
        console.log(`Starting test: ${testInfo.title}`);
        const examplePage = new ExampleGenerationPage(
          page,
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_1,
        );
        await examplePage.openExampleGenerationTabForSpec(
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_1,
        );

        await examplePage.deleteGeneratedExamples();

        await examplePage.generateAndValidateForPaths([
          { path: "findAvailableProducts", responseCodes: [200] },
        ]);

        await examplePage.inlineExamples();

        const expectedUpdatedSpecName = PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_1.replace(
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
