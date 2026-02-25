import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_1 } from "../../specNames";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import {
  filterExampleNames,
  getUpdatedSpecName,
  navigateToUpdatedSpec,
} from "../helpers/inline-examples-helper";

const FIND_AVAILABLE_PRODUCTS = "findAvailableProducts";

test.describe("Inline examples", () => {
  test(
    `Inline an example for findAvailableProducts 200`,
    { tag: ["@examples", "@inlineExamples", "@inline1Example", "@eyes"] },
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
          { path: FIND_AVAILABLE_PRODUCTS, responseCodes: [200] },
        ]);

        const generatedExampleNames = await examplePage.getGeneratedExampleNames();

        await examplePage.inlineExamples();

        const expectedUpdatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_1);

        const [actualTitle, actualMessage] =
          await examplePage.getDialogTitleAndMessage();

        expect.soft(actualTitle).toBe("Examples Inline Complete");
        expect
          .soft(actualMessage)
          .toBe(
            `Successfully inlined examples into ${expectedUpdatedSpecName}`,
          );

        await examplePage.closeInlineSuccessDialog("Examples Inline Complete");

        await test.step("Verify inlined examples appear in the updated spec file", async () => {
          const updatedSpecPage = await navigateToUpdatedSpec(
            page,
            testInfo,
            eyes,
            expectedUpdatedSpecName,
          );

          await updatedSpecPage.verifyInlinedExamplesInSpec(
            filterExampleNames(generatedExampleNames, FIND_AVAILABLE_PRODUCTS, 200),
            FIND_AVAILABLE_PRODUCTS,
            "get",
            200,
          );
        });
      } catch (err) {
        expect
          .soft(err, `Unexpected error in test: ${testInfo.title}`)
          .toBeUndefined();
      }
    },
  );
});
