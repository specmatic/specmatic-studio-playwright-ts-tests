import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../../specNames";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";

function getUpdatedSpecName(specName: string): string {
  return specName.replace(/.yaml$/, "-updated.yaml");
}

async function verifyAndCloseInlineSuccessDialog(
  examplePage: ExampleGenerationPage,
  updatedSpecName: string,
) {
  const [actualTitle, actualMessage] =
    await examplePage.getDialogTitleAndMessage();

  expect.soft(actualTitle).toBe("Examples Inline Complete");
  expect
    .soft(actualMessage)
    .toBe(`Successfully inlined examples into ${updatedSpecName}`);

  await examplePage.closeInlineSuccessDialog("Examples Inline Complete");
}

async function navigateToUpdatedSpec(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
  eyes: any,
  updatedSpecName: string,
): Promise<ExampleGenerationPage> {
  const updatedSpecPage = new ExampleGenerationPage(
    page,
    testInfo,
    eyes,
    updatedSpecName,
  );
  await updatedSpecPage.sideBar.selectSpec(updatedSpecName);
  await updatedSpecPage.openSpecTabForCurrentSpec();
  return updatedSpecPage;
}


test.describe(
  "Validate generated spec after inlining additionally generated (and validated) examples",
  () => {
    test(
      `1 path, 1 response code - Generate, validate, inline and verify updated spec`,
      {
        tag: [
          "@examples",
          "@inlineExamples",
          "@validateInlinedExamplesFor1Path1ResponseCode",
        ],
      },
      async ({ page, eyes }, testInfo) => {
        test.setTimeout(180000);
        try {
          console.log(`Starting test: ${testInfo.title}`);
          const examplePage = new ExampleGenerationPage(
            page,
            testInfo,
            eyes,
            PRODUCT_SEARCH_BFF_SPEC,
          );

          await examplePage.openExampleGenerationTabForSpec(
            testInfo,
            eyes,
            PRODUCT_SEARCH_BFF_SPEC,
          );
          await examplePage.deleteGeneratedExamples();

          
          await examplePage.generateAndValidateForPaths([
            { path: "findAvailableProducts", responseCodes: [200] },
          ]);

          
          await examplePage.clickGenerateMoreButton("findAvailableProducts", 200);

         
          const generatedExampleNames =
            await examplePage.getGeneratedExampleNames();
          console.log(
            `Captured ${generatedExampleNames.length} example names before inlining`,
          );

         
          await examplePage.validateAllExamples();

         
          await examplePage.inlineExamples();

          const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
          await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

         
          await test.step("Validate inline examples in updated spec", async () => {
            const updatedSpecPage = await navigateToUpdatedSpec(
              page,
              testInfo,
              eyes,
              updatedSpecName,
            );

            await updatedSpecPage.verifyInlinedExamplesInSpec(
              generatedExampleNames,
              "findAvailableProducts",
              "get",
              200,
            );

            console.log(
              `✓ Verified ${generatedExampleNames.length} inlined examples in updated spec`,
            );
          });
        } catch (err) {
          expect
            .soft(err, `Unexpected error in test: ${testInfo.title}`)
            .toBeUndefined();
        }
      },
    );

    test(
      `1 path, multiple response codes - Generate, validate, inline and verify updated spec`,
      {
        tag: [
          "@examples",
          "@inlineExamples",
          "@validateInlinedExamplesFor1PathMultipleResponse",
        ],
      },
      async ({ page, eyes }, testInfo) => {
        test.setTimeout(180000);
        try {
          console.log(`Starting test: ${testInfo.title}`);
          const examplePage = new ExampleGenerationPage(
            page,
            testInfo,
            eyes,
            PRODUCT_SEARCH_BFF_SPEC,
          );

          await examplePage.openExampleGenerationTabForSpec(
            testInfo,
            eyes,
            PRODUCT_SEARCH_BFF_SPEC,
          );
          await examplePage.deleteGeneratedExamples();

          await examplePage.generateAndValidateForPaths([
            { path: "findAvailableProducts", responseCodes: [200, 400] },
          ]);

         
          await examplePage.clickGenerateMoreButton("findAvailableProducts", 200);
          await examplePage.clickGenerateMoreButton("findAvailableProducts", 400);

          
          const generatedExampleNames =
            await examplePage.getGeneratedExampleNames();
          console.log(
            `Captured ${generatedExampleNames.length} example names before inlining`,
          );

         
          await examplePage.validateAllExamples();

          
          await examplePage.inlineExamples();

          const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
          await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

         
          await test.step("Validate inline examples in updated spec", async () => {
            const updatedSpecPage = await navigateToUpdatedSpec(
              page,
              testInfo,
              eyes,
              updatedSpecName,
            );

            const examples200 = generatedExampleNames.filter((name) =>
              name.includes("_200_"),
            );
            const examples400 = generatedExampleNames.filter((name) =>
              name.includes("_400_"),
            );

            await updatedSpecPage.verifyInlinedExamplesInSpec(
              examples200,
              "findAvailableProducts",
              "get",
              200,
            );
            await updatedSpecPage.verifyInlinedExamplesInSpec(
              examples400,
              "findAvailableProducts",
              "get",
              400,
            );

            console.log(
              `✓ Verified ${generatedExampleNames.length} inlined examples in updated spec`,
            );
          });
        } catch (err) {
          expect
            .soft(err, `Unexpected error in test: ${testInfo.title}`)
            .toBeUndefined();
        }
      },
    );

    test(
      `multiple paths, multiple response codes - Generate, validate, inline and verify updated spec`,
      {
        tag: [
          "@examples",
          "@inlineExamples",
          "@validateInlinedExamplesForMultiplePaths",
        ],
      },
      async ({ page, eyes }, testInfo) => {
        test.setTimeout(180000);
        try {
          console.log(`Starting test: ${testInfo.title}`);
          const examplePage = new ExampleGenerationPage(
            page,
            testInfo,
            eyes,
            PRODUCT_SEARCH_BFF_SPEC,
          );

          await examplePage.openExampleGenerationTabForSpec(
            testInfo,
            eyes,
            PRODUCT_SEARCH_BFF_SPEC,
          );
          await examplePage.deleteGeneratedExamples();

          
          await examplePage.generateAndValidateForPaths([
            { path: "findAvailableProducts", responseCodes: [200, 400] },
            { path: "products", responseCodes: [201, 400] },
          ]);

      
          const pathsAndCodes = [
            { path: "findAvailableProducts", code: 200 },
            { path: "findAvailableProducts", code: 400 },
            { path: "products", code: 201 },
            { path: "products", code: 400 },
          ];
          for (const { path, code } of pathsAndCodes) {
            await examplePage.clickGenerateMoreButton(path, code);
          }

         
          const generatedExampleNames =
            await examplePage.getGeneratedExampleNames();
          console.log(
            `Captured ${generatedExampleNames.length} example names before inlining`,
          );

         
          await examplePage.validateAllExamples();

        
          await examplePage.inlineExamples();

          const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
          await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

          await test.step("Validate inline examples in updated spec", async () => {
            const updatedSpecPage = await navigateToUpdatedSpec(
              page,
              testInfo,
              eyes,
              updatedSpecName,
            );

            const findAvailableProducts200 = generatedExampleNames.filter(
              (name) =>
                name.includes("findAvailableProducts") &&
                name.includes("_200_"),
            );
            const findAvailableProducts400 = generatedExampleNames.filter(
              (name) =>
                name.includes("findAvailableProducts") &&
                name.includes("_400_"),
            );
            const products201 = generatedExampleNames.filter(
              (name) => name.includes("products") && name.includes("_201_"),
            );
            const products400 = generatedExampleNames.filter(
              (name) => name.includes("products") && name.includes("_400_"),
            );

            await updatedSpecPage.verifyInlinedExamplesInSpec(
              findAvailableProducts200,
              "findAvailableProducts",
              "get",
              200,
            );
            await updatedSpecPage.verifyInlinedExamplesInSpec(
              findAvailableProducts400,
              "findAvailableProducts",
              "get",
              400,
            );
            await updatedSpecPage.verifyInlinedExamplesInSpec(
              products201,
              "products",
              "post",
              201,
            );
            await updatedSpecPage.verifyInlinedExamplesInSpec(
              products400,
              "products",
              "post",
              400,
            );

            console.log(
              `✓ Verified ${generatedExampleNames.length} inlined examples in updated spec`,
            );
          });
        } catch (err) {
          expect
            .soft(err, `Unexpected error in test: ${testInfo.title}`)
            .toBeUndefined();
        }
      },
    );
  },
);
