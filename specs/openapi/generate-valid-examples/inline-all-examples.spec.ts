import { test } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL } from "../../specNames";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import {
  navigateToUpdatedSpec,
  verifyAndCloseInlineSuccessDialog,
} from "../helpers/inline-examples-helper";

const SPEC = PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL;

test.describe("Inline examples", () => {
  test(
    `Inline all examples for '${PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL}'`,
    {
      tag: [
        "@examples",
        "@inlineExamples",
        "@inlineAllExamples",
        "@eyes",
        "@expected-faliure",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      test.fail(true, "Dilaog appearence issue after inlining examples");
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

      // Capture example names before inlining so we can verify them in the updated spec
      const generatedExampleNames =
        await examplePage.getGeneratedExampleNames();

      await examplePage.inlineExamples();
      await verifyAndCloseInlineSuccessDialog(examplePage, SPEC);

      await test.step("Verify inlined examples appear in the updated spec file", async () => {
        const updatedSpecPage = await navigateToUpdatedSpec(
          page,
          testInfo,
          eyes,
          SPEC,
        );

        await updatedSpecPage.verifyInlinedExamplesInSpec(
          generatedExampleNames,
        );
      });
    },
  );
});
