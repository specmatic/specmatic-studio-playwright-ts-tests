import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../../specNames";
import {
  filterExampleNames,
  generateMoreThenValidateAndInline,
  getUpdatedSpecName,
  navigateToUpdatedSpec,
  setupExampleGenerationPage,
  verifyAndCloseInlineSuccessDialog,
} from "../helpers/inline-examples-helper";

const FIND_AVAILABLE_PRODUCTS = "findAvailableProducts";
const PRODUCTS = "products";

test.describe("Validate generated spec after inlining GET examples", () => {
  test(
    "1 path, 1 response code - Generate, validate, inline and verify updated spec",
    {
      tag: [
        "@examples",
        "@inlineExamples",
        "@validateInlinedExamplesFor1Path1Response",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      const examplePage = await setupExampleGenerationPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
        [{ path: FIND_AVAILABLE_PRODUCTS, responseCodes: [200] }],
      );

      const generatedExampleNames = await generateMoreThenValidateAndInline(
        examplePage,
        [{ path: FIND_AVAILABLE_PRODUCTS, code: 200 }],
      );

      const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
      await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

      await test.step("Verify inlined examples appear in the updated spec file", async () => {
        const updatedSpecPage = await navigateToUpdatedSpec(
          page,
          testInfo,
          eyes,
          updatedSpecName,
        );
        await updatedSpecPage.verifyInlinedExamplesInSpec(
          generatedExampleNames,
          FIND_AVAILABLE_PRODUCTS,
          "get",
          200,
        );
      });
    },
  );

  test(
    "1 path, multiple response codes - Generate, validate, inline and verify updated spec",
    {
      tag: [
        "@examples",
        "@inlineExamples",
        "@validateInlinedExamplesFor1PathMultipleResponse",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      const examplePage = await setupExampleGenerationPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
        [{ path: FIND_AVAILABLE_PRODUCTS, responseCodes: [200, 400] }],
      );

      const generatedExampleNames = await generateMoreThenValidateAndInline(
        examplePage,
        [
          { path: FIND_AVAILABLE_PRODUCTS, code: 200 },
          { path: FIND_AVAILABLE_PRODUCTS, code: 400 },
        ],
      );

      const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
      await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

      await test.step("Verify inlined examples appear in the updated spec file", async () => {
        const updatedSpecPage = await navigateToUpdatedSpec(
          page,
          testInfo,
          eyes,
          updatedSpecName,
        );

        await updatedSpecPage.verifyInlinedExamplesInSpec(
          filterExampleNames(
            generatedExampleNames,
            FIND_AVAILABLE_PRODUCTS,
            200,
          ),
          FIND_AVAILABLE_PRODUCTS,
          "get",
          200,
        );
        await updatedSpecPage.verifyInlinedExamplesInSpec(
          filterExampleNames(
            generatedExampleNames,
            FIND_AVAILABLE_PRODUCTS,
            400,
          ),
          FIND_AVAILABLE_PRODUCTS,
          "get",
          400,
        );
      });
    },
  );

  test(
    "Multiple paths, multiple response codes - Generate, validate, inline and verify updated spec",
    {
      tag: [
        "@examples",
        "@inlineExamples",
        "@validateInlinedExamplesForMultiplePaths",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      const examplePage = await setupExampleGenerationPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
        [
          { path: FIND_AVAILABLE_PRODUCTS, responseCodes: [200, 400] },
          { path: PRODUCTS, responseCodes: [201, 400] },
        ],
      );

      const generatedExampleNames = await generateMoreThenValidateAndInline(
        examplePage,
        [
          { path: FIND_AVAILABLE_PRODUCTS, code: 200 },
          { path: FIND_AVAILABLE_PRODUCTS, code: 400 },
          { path: PRODUCTS, code: 201 },
          { path: PRODUCTS, code: 400 },
        ],
      );

      const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
      await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

      await test.step("Verify inlined examples appear in the updated spec file", async () => {
        const updatedSpecPage = await navigateToUpdatedSpec(
          page,
          testInfo,
          eyes,
          updatedSpecName,
        );

        await updatedSpecPage.verifyInlinedExamplesInSpec(
          filterExampleNames(
            generatedExampleNames,
            FIND_AVAILABLE_PRODUCTS,
            200,
          ),
          FIND_AVAILABLE_PRODUCTS,
          "get",
          200,
        );
        await updatedSpecPage.verifyInlinedExamplesInSpec(
          filterExampleNames(
            generatedExampleNames,
            FIND_AVAILABLE_PRODUCTS,
            400,
          ),
          FIND_AVAILABLE_PRODUCTS,
          "get",
          400,
        );
        await updatedSpecPage.verifyInlinedExamplesInSpec(
          filterExampleNames(generatedExampleNames, PRODUCTS, 201),
          PRODUCTS,
          "post",
          201,
        );
        await updatedSpecPage.verifyInlinedExamplesInSpec(
          filterExampleNames(generatedExampleNames, PRODUCTS, 400),
          PRODUCTS,
          "post",
          400,
        );
      });
    },
  );
});
