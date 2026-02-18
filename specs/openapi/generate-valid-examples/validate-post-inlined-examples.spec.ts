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
  "Validate generated spec after inlining POST request examples",
  () => {
    test(
      `POST 1 path, 1 response code - Generate, validate, inline and verify updated spec`,
      {
        tag: [
          "@examples",
          "@inlineExamples",
          "@validateInlinedPostExamplesFor1Path1ResponseCode",
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
            { path: "products", responseCodes: [201] },
          ]);

         
          await examplePage.clickGenerateMoreButton("products", 201);

        
          const generatedExampleNames =
            await examplePage.getGeneratedExampleNames();
          console.log(
            `Captured ${generatedExampleNames.length} example names before inlining`,
          );

          
          await examplePage.validateAllExamples();

          await examplePage.inlineExamples();

          const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
          await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

          await test.step(
            "Validate inlined POST examples in updated spec",
            async () => {
              const updatedSpecPage = await navigateToUpdatedSpec(
                page,
                testInfo,
                eyes,
                updatedSpecName,
              );

              await updatedSpecPage.verifyInlinedPostExamplesInSpec(
                generatedExampleNames,
                "products",
                201,
              );

              console.log(
                `✓ Verified ${generatedExampleNames.length} inlined POST examples (request + response) in updated spec`,
              );
            },
          );
        } catch (err) {
          expect
            .soft(err, `Unexpected error in test: ${testInfo.title}`)
            .toBeUndefined();
        }
      },
    );

    test(
      `POST 1 path, multiple response codes - Generate, validate, inline and verify updated spec`,
      {
        tag: [
          "@examples",
          "@inlineExamples",
          "@validateInlinedPostExamplesFor1PathMultipleResponse",
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
            { path: "products", responseCodes: [201, 400] },
          ]);

        
          await examplePage.clickGenerateMoreButton("products", 201);
          await examplePage.clickGenerateMoreButton("products", 400);

          
          const generatedExampleNames =
            await examplePage.getGeneratedExampleNames();
          console.log(
            `Captured ${generatedExampleNames.length} example names before inlining`,
          );

    
          await examplePage.validateAllExamples();

        
          await examplePage.inlineExamples();

          const updatedSpecName = getUpdatedSpecName(PRODUCT_SEARCH_BFF_SPEC);
          await verifyAndCloseInlineSuccessDialog(examplePage, updatedSpecName);

         
          await test.step(
            "Validate inlined POST examples in updated spec",
            async () => {
              const updatedSpecPage = await navigateToUpdatedSpec(
                page,
                testInfo,
                eyes,
                updatedSpecName,
              );

              const examples201 = generatedExampleNames.filter((name) =>
                name.includes("_201_"),
              );
              const examples400 = generatedExampleNames.filter((name) =>
                name.includes("_400_"),
              );

             
              await updatedSpecPage.verifyInlinedPostExamplesInSpec(
                examples201,
                "products",
                201,
              );

           
              await updatedSpecPage.verifyInlinedPostExamplesInSpec(
                examples400,
                "products",
                400,
              );

              console.log(
                `✓ Verified ${generatedExampleNames.length} inlined POST examples (request + response) in updated spec`,
              );
            },
          );
        } catch (err) {
          expect
            .soft(err, `Unexpected error in test: ${testInfo.title}`)
            .toBeUndefined();
        }
      },
    );

    test(
      `POST multiple paths, multiple response codes - Generate, validate, inline and verify updated spec`,
      {
        tag: [
          "@examples",
          "@inlineExamples",
          "@validateInlinedPostExamplesForMultiplePaths",
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
            { path: "products", responseCodes: [201, 400] },
            { path: "ordres", responseCodes: [201, 400] },
          ]);

        
          const pathsAndCodes = [
            { path: "products", code: 201 },
            { path: "products", code: 400 },
            { path: "ordres", code: 201 },
            { path: "ordres", code: 400 },
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

          
          await test.step(
            "Validate inlined POST examples in updated spec",
            async () => {
              const updatedSpecPage = await navigateToUpdatedSpec(
                page,
                testInfo,
                eyes,
                updatedSpecName,
              );

              const products201 = generatedExampleNames.filter(
                (name) =>
                  name.includes("products") && name.includes("_201_"),
              );
              const products400 = generatedExampleNames.filter(
                (name) =>
                  name.includes("products") && name.includes("_400_"),
              );
              const orders201 = generatedExampleNames.filter(
                (name) =>
                  name.includes("ordres") && name.includes("_201_"),
              );
              const orders400 = generatedExampleNames.filter(
                (name) =>
                  name.includes("ordres") && name.includes("_400_"),
              );

              
              await updatedSpecPage.verifyInlinedPostExamplesInSpec(
                products201,
                "products",
                201,
              );
              await updatedSpecPage.verifyInlinedPostExamplesInSpec(
                products400,
                "products",
                400,
              );
              await updatedSpecPage.verifyInlinedPostExamplesInSpec(
                orders201,
                "ordres",
                201,
              );
              await updatedSpecPage.verifyInlinedPostExamplesInSpec(
                orders400,
                "ordres",
                400,
              );

              console.log(
                `✓ Verified ${generatedExampleNames.length} inlined POST examples (request + response) in updated spec`,
              );
            },
          );
        } catch (err) {
          expect
            .soft(err, `Unexpected error in test: ${testInfo.title}`)
            .toBeUndefined();
        }
      },
    );
  },
);
