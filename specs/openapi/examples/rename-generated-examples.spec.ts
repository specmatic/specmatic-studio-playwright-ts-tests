import fs from "node:fs";
import path from "node:path";
import { expect, test } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_1_PATH } from "../../specNames";
import { setupExampleGenerationPage } from "../helpers/inline-examples-helper";

const RESPONSE_CODE = 201;
const PRODUCTS = "products";
const SPEC = PRODUCT_SEARCH_BFF_SPEC_EXAMPLES_1_PATH;
const EXAMPLES_DIR = path.join(
  process.cwd(),
  "specmatic-studio-demo",
  "specs",
  SPEC.replace(/\.yaml$/, "_examples"),
);

function exampleFilePath(fileName: string): string {
  return path.join(EXAMPLES_DIR, fileName);
}

function renamedExamplePath(fileName: string): string {
  return `./${SPEC.replace(/\.yaml$/, "_examples")}/${fileName}`;
}

test.describe("Rename generated examples", () => {
  test("rename generated example succeeds", async ({ page, eyes }, testInfo) => {
    const examplePage = await setupExampleGenerationPage(
      page,
      testInfo,
      eyes,
      SPEC,
      [{ path: PRODUCTS, responseCodes: [RESPONSE_CODE] }],
    );

    const renamedFileName = `renamed-example-${Date.now()}.json`;
    const [oldFileName] = await examplePage.getGeneratedExampleNames();
    expect(fs.existsSync(exampleFilePath(oldFileName))).toBe(true);

    await examplePage.renameGeneratedExample(PRODUCTS, RESPONSE_CODE, renamedFileName);
    await expect
      .poll(() => examplePage.getExampleFilesForEndpoint(PRODUCTS))
      .toContain(renamedFileName);

    expect(fs.existsSync(exampleFilePath(renamedFileName))).toBe(true);
    expect(fs.existsSync(exampleFilePath(oldFileName))).toBe(false);

    await examplePage.clickViewDetails(PRODUCTS, RESPONSE_CODE);
    await expect(examplePage.getCurrentExampleRelativeFilePath()).resolves.toBe(renamedExamplePath(renamedFileName));
    await examplePage.goBackFromExample();
    await expect
      .poll(() => examplePage.getExampleFilesForEndpoint(PRODUCTS))
      .toContain(renamedFileName);
  });

  test("rename generated example to existing name displays error", async ({ page, eyes }, testInfo) => {
    const examplePage = await setupExampleGenerationPage(
      page,
      testInfo,
      eyes,
      SPEC,
      [{ path: PRODUCTS, responseCodes: [RESPONSE_CODE] }],
    );

    await examplePage.clickGenerateMoreButton(PRODUCTS, RESPONSE_CODE);
    const [_, newlyGeneratedExample] = await examplePage.getGeneratedExampleNames();
    await examplePage.renameGeneratedExample(PRODUCTS, RESPONSE_CODE, newlyGeneratedExample);
    expect(await examplePage.getRenameError(PRODUCTS, RESPONSE_CODE)).toMatch(/already exists/i);
  });

  test("invalid renamed example stays invalid until fixed", async ({ page, eyes }, testInfo) => {
    const examplePage = await setupExampleGenerationPage(
      page,
      testInfo,
      eyes,
      SPEC,
      [{ path: PRODUCTS, responseCodes: [RESPONSE_CODE] }],
    );

    const [oldFileName] = await examplePage.getGeneratedExampleNames();
    const renamedFileName = `renamed-invalid-example-${Date.now()}.json`;
    await examplePage.renameGeneratedExample(PRODUCTS, RESPONSE_CODE, renamedFileName);
    await examplePage.clickViewDetails(PRODUCTS, RESPONSE_CODE);

    const validContent = await examplePage.getEditorContent();
    const invalidContent = validContent.replace(/"inventory"/, '"inventy"');

    await examplePage.replaceEditorContent(invalidContent);
    await examplePage.saveEditedExample("Invalid Example");
    await expect(examplePage.getCollapsedErrorSummaryCount()).resolves.toBeGreaterThan(0);

    await examplePage.goBackFromExample();
    await examplePage.clickViewDetails(PRODUCTS, RESPONSE_CODE);
    await expect(examplePage.getCurrentExampleRelativeFilePath()).resolves.toBe(renamedExamplePath(renamedFileName));
    await expect(examplePage.getCollapsedErrorSummaryCount()).resolves.toBeGreaterThan(0);

    await examplePage.fixExampleWithAutoFix();
    await examplePage.saveEditedExample("Valid Example");
    await expect(examplePage.getCurrentExampleRelativeFilePath()).resolves.toBe(renamedExamplePath(renamedFileName));
    await examplePage.goBackFromExample();

    await expect
      .poll(() => examplePage.getExampleFilesForEndpoint(PRODUCTS))
      .toContain(renamedFileName);

    expect(await examplePage.getExampleFilesForEndpoint(PRODUCTS)).not.toContain(oldFileName);
    expect(fs.existsSync(exampleFilePath(renamedFileName))).toBe(true);
    expect(fs.existsSync(exampleFilePath(oldFileName))).toBe(false);
  });
});
