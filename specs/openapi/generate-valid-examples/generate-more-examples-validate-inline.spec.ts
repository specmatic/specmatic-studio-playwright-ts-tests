import { test } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_VALIDATE_INLINED } from "../../specNames";
import {
  generateMoreThenValidateAndInline,
  getUpdatedSpecName,
  navigateToUpdatedSpec,
  setupExampleGenerationPage,
  verifyAndCloseInlineSuccessDialog,
} from "../helpers/inline-examples-helper";

const SPEC = PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_VALIDATE_INLINED;
const FIND_AVAILABLE_PRODUCTS = "findAvailableProducts";
const PRODUCTS = "products";

const PATHS_AND_CODES = [
  { path: FIND_AVAILABLE_PRODUCTS, method: "get", code: 200 },
  { path: FIND_AVAILABLE_PRODUCTS, method: "get", code: 400 },
  { path: PRODUCTS, method: "post", code: 201 },
  { path: PRODUCTS, method: "post", code: 400 },
];

test.describe("Validate generated spec after inlining GET examples", () => {
  test(
    "Multiple paths, multiple response codes - Generate, validate, inline and verify updated spec",
    {
      tag: [
        "@examples",
        "@inlineExamples",
        "@validateInlinedExamplesForMultiplePaths",
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
          { path: FIND_AVAILABLE_PRODUCTS, responseCodes: [200, 400] },
          { path: PRODUCTS, responseCodes: [201, 400] },
        ],
      );

      const generatedExampleNames = await generateMoreThenValidateAndInline(
        examplePage,
        PATHS_AND_CODES,
      );

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
