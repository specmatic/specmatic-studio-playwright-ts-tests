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

const PRODUCTS = "products";
const ORDRES = "ordres";

test.describe("Validate generated spec after inlining POST request examples", () => {
  test(
    "POST 1 path, 1 response code - Generate, validate, inline and verify updated spec",
    {
      tag: [
        "@examples",
        "@inlineExamples",
        "@validateInlinedPostExamplesFor1Path1ResponseCode",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      const examplePage = await setupExampleGenerationPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
        [{ path: PRODUCTS, responseCodes: [201] }],
      );

      const generatedExampleNames = await generateMoreThenValidateAndInline(
        examplePage,
        [{ path: PRODUCTS, code: 201 }],
      );

      const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
      await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

      await test.step("Verify inlined POST examples appear in the updated spec file", async () => {
        const updatedSpecPage = await navigateToUpdatedSpec(
          page,
          testInfo,
          eyes,
          updatedSpecName,
        );
        await updatedSpecPage.verifyInlinedPostExamplesInSpec(
          generatedExampleNames,
          PRODUCTS,
          201,
        );
      });
    },
  );

  test(
    "POST 1 path, multiple response codes - Generate, validate, inline and verify updated spec",
    {
      tag: [
        "@examples",
        "@inlineExamples",
        "@validateInlinedPostExamplesFor1PathMultipleResponse",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      const examplePage = await setupExampleGenerationPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
        [{ path: PRODUCTS, responseCodes: [201, 400] }],
      );

      const generatedExampleNames = await generateMoreThenValidateAndInline(
        examplePage,
        [
          { path: PRODUCTS, code: 201 },
          { path: PRODUCTS, code: 400 },
        ],
      );

      const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
      await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

      await test.step("Verify inlined POST examples appear in the updated spec file", async () => {
        const updatedSpecPage = await navigateToUpdatedSpec(
          page,
          testInfo,
          eyes,
          updatedSpecName,
        );

        await updatedSpecPage.verifyInlinedPostExamplesInSpec(
          filterExampleNames(generatedExampleNames, PRODUCTS, 201),
          PRODUCTS,
          201,
        );
        await updatedSpecPage.verifyInlinedPostExamplesInSpec(
          filterExampleNames(generatedExampleNames, PRODUCTS, 400),
          PRODUCTS,
          400,
        );
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
      ],
    },
    async ({ page, eyes }, testInfo) => {
      const examplePage = await setupExampleGenerationPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
        [
          { path: PRODUCTS, responseCodes: [201, 400] },
          { path: ORDRES, responseCodes: [201, 400] },
        ],
      );

      const generatedExampleNames = await generateMoreThenValidateAndInline(
        examplePage,
        [
          { path: PRODUCTS, code: 201 },
          { path: PRODUCTS, code: 400 },
          { path: ORDRES, code: 201 },
          { path: ORDRES, code: 400 },
        ],
      );

      const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
      await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

      await test.step("Verify inlined POST examples appear in the updated spec file", async () => {
        const updatedSpecPage = await navigateToUpdatedSpec(
          page,
          testInfo,
          eyes,
          updatedSpecName,
        );

        await updatedSpecPage.verifyInlinedPostExamplesInSpec(
          filterExampleNames(generatedExampleNames, PRODUCTS, 201),
          PRODUCTS,
          201,
        );
        await updatedSpecPage.verifyInlinedPostExamplesInSpec(
          filterExampleNames(generatedExampleNames, PRODUCTS, 400),
          PRODUCTS,
          400,
        );
        await updatedSpecPage.verifyInlinedPostExamplesInSpec(
          filterExampleNames(generatedExampleNames, ORDRES, 201),
          ORDRES,
          201,
        );
        await updatedSpecPage.verifyInlinedPostExamplesInSpec(
          filterExampleNames(generatedExampleNames, ORDRES, 400),
          ORDRES,
          400,
        );
      });
    },
  );
});
