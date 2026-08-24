import fs from "node:fs";
import path from "node:path";
import { expect, test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { INLINE_EXAMPLES_READONLY_OPENAPI_SPEC } from "../../specNames";

const SPEC = INLINE_EXAMPLES_READONLY_OPENAPI_SPEC;
const SPEC_FILE = path.join(process.cwd(), "specmatic-studio-demo", "specs", SPEC);
test.describe.configure({ mode: "serial" });

test.describe("OpenAPI inline examples", () => {
  test(
    "lists all inline examples in the examples table",
    { tag: ["@openapi", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = await openExamplesPage(page, eyes, testInfo);
      await examplesPage.assertInlineExamplesListed(["SUCCESS", "CREATE_SUCCESS", "CREATE_INVALID"]);
      await examplesPage.assertInlineExampleCount("SUCCESS", 2);
    },
  );

  test(
    "edits an inline example, including invalid content, and persists it to the spec file",
    { tag: ["@openapi", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = await openExamplesPage(page, eyes, testInfo);

      await examplesPage.openInlineExample("CREATE_SUCCESS", "/create-orders");
      await examplesPage.assertInlineDetailsEditable(['"customerId"', "7", '"item"', "keyboard", '"id"', "303"], "CREATE_SUCCESS");
      await examplesPage.editExample([
        {
          current: { mode: "exact", value: '"item": "keyboard"' },
          changeTo: '"item": 123',
        },
      ]);

      await examplesPage.saveEditedExample("Invalid Example");
      await expect
        .poll(() => readSpecFile(), { timeout: 15000 })
        .toMatch(/CREATE_SUCCESS:\s+value:\s+customerId:\s+7\s+item:\s+123/);
    },
  );

  test(
    "fixes an invalid inline example and persists the correction to the spec file",
    { tag: ["@openapi", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = await openExamplesPage(page, eyes, testInfo);
      await examplesPage.openInlineExample("CREATE_INVALID");
      await examplesPage.assertInlineDetailsEditable(['"customerId"', "invalid", '"id"'], "CREATE_INVALID");

      await examplesPage.validateInlineExample("CREATE_INVALID", undefined, "red");
      await examplesPage.assertInlineValidationState("CREATE_INVALID", undefined, "red");
      await examplesPage.openInlineExample("CREATE_INVALID");

      await examplesPage.assertInlineValidationDetails("Invalid Example", true);
      await examplesPage.assertInlineFixActionVisible();

      await examplesPage.fixExampleWithAutoFix();
      await examplesPage.goBackFromExample();
      await examplesPage.assertInlineValidationState("CREATE_INVALID");
      await expect
        .poll(() => readSpecFile(), { timeout: 15000 })
        .not.toContain("invalid");
    },
  );

  test(
    "renames an inline example and persists the new name to the spec file",
    { tag: ["@openapi", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = await openExamplesPage(page, eyes, testInfo);
      await examplesPage.renameInlineExample("SUCCESS", "RENAMED_SUCCESS", "/orders");
      await examplesPage.assertInlineExamplesListed(["RENAMED_SUCCESS"]);
      await expect
        .poll(() => readSpecFile(), { timeout: 15000 })
        .toContain("RENAMED_SUCCESS");
    },
  );

  test(
    "deletes an inline example and removes it from the spec file",
    { tag: ["@openapi", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = await openExamplesPage(page, eyes, testInfo);
      await examplesPage.deleteInlineExample("CREATE_INVALID");
      await examplesPage.assertInlineExampleCount("CREATE_INVALID", 0);
      await expect
        .poll(() => readSpecFile(), { timeout: 15000 })
        .not.toContain("CREATE_INVALID");
    },
  );
});

async function openExamplesPage(page: import("@playwright/test").Page, eyes: any, testInfo: import("@playwright/test").TestInfo): Promise<ExampleGenerationPage> {
  const examplesPage = new ExampleGenerationPage(page, testInfo, eyes, SPEC);
  await examplesPage.openExampleGenerationTabForSpec(testInfo, eyes, SPEC);
  return examplesPage;
}

function readSpecFile(): string {
  return fs.readFileSync(SPEC_FILE, "utf8");
}
