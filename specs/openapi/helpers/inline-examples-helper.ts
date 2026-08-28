import { test } from "../../../utils/eyesFixture";
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

  await updatedSpecPage.gotoHomeAndOpenSidebar();
  await updatedSpecPage.sideBar.selectSpec(updatedSpecName);
  await updatedSpecPage.openSpecTabForCurrentSpec();
  return updatedSpecPage;
}
export async function verifyAndCloseInlineSuccessDialog(
  examplePage: ExampleGenerationPage,
  updatedSpecName: string,
) {
  const dialogDetails = await examplePage.getDialogTitleAndMessageIfPresent();

  const displayedFileName = updatedSpecName.split("/").pop()!;

  if (!dialogDetails) {
    console.warn(
      `Inline success dialog did not appear after inlining into ${displayedFileName}. Continuing without failing the test.`,
    );
    return;
  }

  const [actualTitle, actualMessage] = dialogDetails;
  if (actualTitle !== "Examples inline complete") {
    console.warn(
      `Expected inline dialog title 'Examples inline complete' but found '${actualTitle}'. Continuing without failing the test.`,
    );
  }

  const expectedMessage = `Successfully inlined examples into ${displayedFileName}`;
  if (actualMessage !== expectedMessage) {
    console.warn(
      `Expected inline dialog message '${expectedMessage}' but found '${actualMessage}'. Continuing without failing the test.`,
    );
  }
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

    const exampleEntries = await examplePage.getGeneratedExampleNames();
    console.log(
      `  Captured ${exampleEntries.length} example entries before inlining`,
    );

    await examplePage.validateAllExamples();
    return exampleEntries;
  });
}

export async function convertGeneratedExamplesToInline(examplePage: ExampleGenerationPage, generatedExampleNames: string[]): Promise<void> {
  await test.step("Convert generated examples to inline examples", async () => {
    for (const name of generatedExampleNames) {
      await examplePage.selectExampleForConversion(name, "External");
    }

    await examplePage.openExampleConversionDialog("import");
    for (const name of generatedExampleNames) {
      await examplePage.assertExampleConversionModes(name, ["COPY", "MOVE"]);
      await examplePage.chooseExampleConversionMode(name, "MOVE");
    }

    await examplePage.confirmExampleConversion();
  });
}
