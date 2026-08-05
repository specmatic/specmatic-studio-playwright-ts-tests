import { test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { INLINE_EXAMPLES_READONLY_OPENAPI_SPEC } from "../../specNames";

test.describe("OpenAPI inline examples", () => {
  test(
    "lists, views, and validates duplicate-name inline examples as read-only",
    { tag: ["@openapi", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = new ExampleGenerationPage(
        page,
        testInfo,
        eyes,
        INLINE_EXAMPLES_READONLY_OPENAPI_SPEC,
      );

      await examplesPage.openExampleGenerationTabForSpec(
        testInfo,
        eyes,
        INLINE_EXAMPLES_READONLY_OPENAPI_SPEC,
      );

      await examplesPage.assertInlineExamplesListed(["SUCCESS", "CREATE_SUCCESS", "CREATE_INVALID"]);
      await examplesPage.assertInlineExampleCount("SUCCESS", 2);
      await examplesPage.assertInlineRowMutationActionsHidden("SUCCESS", "/orders");

      await examplesPage.openInlineExample("CREATE_SUCCESS", "/create-orders");
      await examplesPage.assertInlineDetails(
        ['"customerId"', "7", '"item"', "keyboard", '"id"', "303"],
        "CREATE_SUCCESS",
      );

      await examplesPage.assertInlineMutationActionsHidden();
      await examplesPage.validateInlineExample("CREATE_SUCCESS", "/create-orders");
      await examplesPage.assertInlineValidationState("CREATE_SUCCESS", "/create-orders");

      await examplesPage.openInlineExample("CREATE_INVALID");
      await examplesPage.assertInlineDetails(
        ['"customerId"', "invalid", '"id"'],
        "CREATE_INVALID",
      );

      await examplesPage.validateInlineExample("CREATE_INVALID", undefined, "red");
      await examplesPage.assertInlineValidationState("CREATE_INVALID", undefined, "red");
      await examplesPage.openInlineExample("CREATE_INVALID");
      await examplesPage.assertInlineValidationDetails("Invalid Example", true);
    },
  );
});
