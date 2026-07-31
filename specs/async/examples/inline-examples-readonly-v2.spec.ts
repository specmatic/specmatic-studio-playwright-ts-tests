import { test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { INLINE_EXAMPLES_READONLY_ASYNC_V2_SPEC } from "../../specNames";

test.describe("AsyncAPI 2.x inline examples", () => {
  test(
    "lists, groups, views, and validates v2 inline exchanges as read-only",
    { tag: ["@async", "@async2", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = new ExampleGenerationPage(
        page,
        testInfo,
        eyes,
        INLINE_EXAMPLES_READONLY_ASYNC_V2_SPEC,
        "async",
      );

      await examplesPage.openExampleGenerationTabForSpec(
        testInfo,
        eyes,
        INLINE_EXAMPLES_READONLY_ASYNC_V2_SPEC,
      );

      await examplesPage.assertInlineExamplesListed(["NewOrder", "CancelledOrder"]);
      await examplesPage.assertInlineRowMutationActionsHidden("NewOrder", "receiveOrder");
      await examplesPage.openInlineExample("NewOrder", "receiveOrder");
      await examplesPage.assertInlineDetails(['"id"', "101", '"status"', "created"], "NewOrder");

      await examplesPage.assertInlineMutationActionsHidden();
      await examplesPage.validateInlineExample("NewOrder", "receiveOrder");
      await examplesPage.assertInlineValidationState("NewOrder", "receiveOrder");
    },
  );
});
