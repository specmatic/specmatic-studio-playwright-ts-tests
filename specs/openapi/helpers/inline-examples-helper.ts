import { test, expect } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";

export function getUpdatedSpecName(specName: string): string {
  return specName.replace(/.yaml$/, "-updated.yaml");
}

export async function navigateToUpdatedSpec(
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
export async function verifyAndCloseInlineSuccessDialog(
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

export async function setupExampleGenerationPage(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
  eyes: any,
  specName: string,
  paths: { path: string; responseCodes: number[] }[],
): Promise<ExampleGenerationPage> {
  const examplePage = new ExampleGenerationPage(page, testInfo, eyes, specName);
  await examplePage.openExampleGenerationTabForSpec(testInfo, eyes, specName);
  await examplePage.deleteGeneratedExamples();
  await examplePage.generateAndValidateForPaths(paths);
  return examplePage;
}

export async function generateMoreThenValidateAndInline(
  examplePage: ExampleGenerationPage,
  pathsAndCodes: { path: string; code: number }[],
): Promise<string[]> {
  return await test.step("Generate more examples, validate all, and inline", async () => {
    for (const { path, code } of pathsAndCodes) {
      await examplePage.clickGenerateMoreButton(path, code);
    }

    const exampleNames = await examplePage.getGeneratedExampleNames();
    console.log(
      `  Captured ${exampleNames.length} example names before inlining`,
    );

    await examplePage.validateAllExamples();
    await examplePage.inlineExamples();

    return exampleNames;
  });
}


export function filterExampleNames(
  allNames: string[],
  pathKeyword: string,
  responseCode: number,
): string[] {
  return allNames.filter(
    (name) => name.includes(pathKeyword) && name.includes(`_${responseCode}_`),
  );
}
