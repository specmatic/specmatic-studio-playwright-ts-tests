import { test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { INLINE_EXAMPLES_READONLY_ASYNC_SPEC } from "../../specNames";

test.describe("AsyncAPI inline examples", () => {
  test(
    "lists, groups, views, and validates inline exchanges as read-only",
    { tag: ["@async", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = new ExampleGenerationPage(
        page,
        testInfo,
        eyes,
        INLINE_EXAMPLES_READONLY_ASYNC_SPEC,
        "async",
      );

      await examplesPage.openExampleGenerationTabForSpec(
        testInfo,
        eyes,
        INLINE_EXAMPLES_READONLY_ASYNC_SPEC,
      );

      await examplesPage.assertInlineExamplesListed(["NewOrder", "CancelledOrder", "InvalidOrder"]);
      await examplesPage.assertInlineRowMutationActionsHidden("NewOrder", "receiveOrder");

      await examplesPage.openInlineExample("NewOrder", "receiveOrder");
      await examplesPage.assertInlineDetails(['"id"', "101", '"status"', "created"], "NewOrder");

      await examplesPage.assertInlineMutationActionsHidden();
      await examplesPage.validateInlineExample("NewOrder", "receiveOrder");
      await examplesPage.assertInlineValidationState("NewOrder", "receiveOrder");

      await examplesPage.openInlineExample("InvalidOrder");
      await examplesPage.assertInlineDetails(['"id"', "303", '"status"', "rejected"], "InvalidOrder");
      await examplesPage.validateInlineExample("InvalidOrder", undefined, "red");
      await examplesPage.assertInlineValidationState("InvalidOrder", undefined, "red");

      await examplesPage.openInlineExample("InvalidOrder");
      await examplesPage.assertInlineValidationDetails("Invalid Example", true);
    },
  );
});
