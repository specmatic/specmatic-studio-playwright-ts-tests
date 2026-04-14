import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_VALIDATE_POST_INLINED } from "../../specNames";
import {
  generateMoreThenValidateAndInline,
  navigateToUpdatedSpec,
  setupExampleGenerationPage,
  verifyAndCloseInlineSuccessDialog,
} from "../helpers/inline-examples-helper";

const SPEC = PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_VALIDATE_POST_INLINED;
const PRODUCTS = "products";
const ORDRES = "ordres";

/** All path + response-code combinations exercised by this test. */
const POST_PATHS_AND_CODES = [
  { path: PRODUCTS, code: 201 },
  { path: PRODUCTS, code: 400 },
  { path: ORDRES, code: 201 },
  { path: ORDRES, code: 400 },
];

const POST_ERROR_EXAMPLE_ASSERTIONS = [
  {
    path: PRODUCTS,
    code: 400,
    unexpectedSnippet: '"name": null',
    expectedField: '"name"',
  },
  {
    path: ORDRES,
    code: 400,
    unexpectedSnippet: '"productid": null',
    expectedField: '"productid"',
  },
];

test.describe("Validate generated spec after inlining POST request examples", () => {
  test(
    "POST 400 generated examples should not use null for required request fields",
    {
      tag: ["@examples", "@inlineExamples", "@expectedFailure", "@eyes"],
    },
    async ({ page, eyes }, testInfo) => {
      test.fail(
        true,
        "POST 400 example generation currently produces null for required request fields",
      );

      const examplePage = await setupExampleGenerationPage(
        page,
        testInfo,
        eyes,
        SPEC,
        [
          { path: PRODUCTS, responseCodes: [400] },
          { path: ORDRES, responseCodes: [400] },
        ],
      );

      await test.step("Verify initial POST 400 examples use meaningful request field values", async () => {
        for (const {
          path,
          code,
          unexpectedSnippet,
          expectedField,
        } of POST_ERROR_EXAMPLE_ASSERTIONS) {
          await examplePage.clickViewDetails(path, code);

          const editorContent = await examplePage.getEditorContent();
          expect(editorContent).toContain(expectedField);
          expect(editorContent).not.toContain(unexpectedSnippet);

          await examplePage.goBackFromExample();
        }
      });
    },
  );

  test(
    "POST multiple paths, multiple response codes - Generate, validate, inline and verify updated spec",
    {
      tag: [
        "@examples",
        "@inlineExamples",
        "@validateInlinedPostExamplesForMultiplePaths",
        "@eyes",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      const examplePage = await setupExampleGenerationPage(
        page,
        testInfo,
        eyes,
        SPEC,
        [
          { path: PRODUCTS, responseCodes: [201, 400] },
          { path: ORDRES, responseCodes: [201, 400] },
        ],
      );

      const generatedExampleNames = await generateMoreThenValidateAndInline(
        examplePage,
        POST_PATHS_AND_CODES,
      );

      await verifyAndCloseInlineSuccessDialog(examplePage, SPEC);

      await test.step("Verify inlined POST examples appear in the updated spec file", async () => {
        const updatedSpecPage = await navigateToUpdatedSpec(
          page,
          testInfo,
          eyes,
          SPEC,
        );

        for (const { path, code } of POST_PATHS_AND_CODES) {
          await updatedSpecPage.verifyInlinedExamplesInSpec(
            generatedExampleNames,
          );
        }
      });
      await test.step("Verify inlined examples are backward compatible", async () => {
        const configPage = new ServiceSpecConfigPage(
          page,
          testInfo,
          eyes,
          SPEC,
        );
        await configPage.runBackwardCompatibilityTest();
        const toastText = await configPage.getAlertMessageText();
        expect(toastText).toBe("Changes are backward compatible");
      });
    },
  );
});
