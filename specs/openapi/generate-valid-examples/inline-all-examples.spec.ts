import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL } from "../../specNames";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import {
  filterExampleNames,
  getUpdatedSpecName,
  navigateToUpdatedSpec,
} from "../helpers/inline-examples-helper";

const FIND_AVAILABLE_PRODUCTS = "findAvailableProducts";
const PRODUCTS = "products";
const ORDRES = "ordres";
const MONITOR = "monitor";

test.describe("Inline examples", () => {
  test(
    `Inline all examples for '${PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL}'`,
    {
      tag: [
        "@examples",
        "@inlineExamples",
        "@inlineAllExamples",
        "@eyes",
        "@expected-failure",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      test.fail(true, "Issue needs to be fixed by dev");
      try {
        console.log(`Starting test: ${testInfo.title}`);
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

        const expectedUpdatedSpecName = getUpdatedSpecName(
          PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_INLINE_ALL,
        );

        const [actualTitle, actualMessage] =
          await examplePage.getDialogTitleAndMessage();

        expect.soft(actualTitle).toBe("Examples Inline Complete");
        expect(actualMessage).toBe(
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

          const endpoints: {
            path: string;
            method: "get" | "post";
            codes: number[];
          }[] = [
            { path: FIND_AVAILABLE_PRODUCTS, method: "get",  codes: [200, 429, 400] },
            { path: PRODUCTS,                method: "post", codes: [201, 202, 400] },
            { path: ORDRES,                  method: "post", codes: [201, 202, 400] },
            { path: MONITOR,                 method: "get",  codes: [200, 400] },
          ];

          const pathsToVerify = endpoints.flatMap(({ path, method, codes }) =>
            codes.map((code) => ({ path, method, code })),
          );

          for (const { path, method, code } of pathsToVerify) {
            const names = filterExampleNames(generatedExampleNames, path, code);

            if (names.length === 0) {
              console.log(
                `  Skipping verification for ${method.toUpperCase()} /${path} ${code} — no generated examples found`,
              );
              continue;
            }

            if (method === "get") {
              await updatedSpecPage.verifyInlinedExamplesInSpec(
                names,
                path,
                method,
                code,
              );
            } else {
              await updatedSpecPage.verifyInlinedPostExamplesInSpec(
                names,
                path,
                code,
              );
            }
          }
        });
      } catch (err) {
        expect
          .soft(err, `Unexpected error in test: ${testInfo.title}`)
          .toBeUndefined();
      }
    },
  );
});
