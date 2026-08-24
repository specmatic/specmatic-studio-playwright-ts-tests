import fs from "node:fs";
import path from "node:path";
import { expect, test } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { INLINE_EXAMPLES_READONLY_ASYNC_SPEC } from "../../specNames";

const SPEC = INLINE_EXAMPLES_READONLY_ASYNC_SPEC;
const SPEC_FILE = path.join(process.cwd(), "specmatic-studio-demo", "specs", SPEC);
test.describe.configure({ mode: "serial" });

test.describe("AsyncAPI inline examples", () => {
  test(
    "lists all inline examples in the examples table",
    { tag: ["@async", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = await openExamplesPage(page, eyes, testInfo);
      await examplesPage.assertInlineExamplesListed(["NewOrder", "CancelledOrder", "InvalidOrder"]);
    },
  );

  test(
    "edits an inline example, including invalid content, and persists it to the spec file",
    { tag: ["@async", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = await openExamplesPage(page, eyes, testInfo);

      await examplesPage.openInlineExample("NewOrder");
      await examplesPage.assertInlineDetailsEditable(['"id"', "101", '"status"', "created"], "NewOrder");
      await examplesPage.editExample([
        {
          current: { mode: "exact", value: '"status": "created"' },
          changeTo: '"status": "invalid"',
        },
      ]);

      await examplesPage.saveEditedExample("Invalid Example");
      await examplesPage.validateInlineExample("NewOrder", undefined, "red");
      await examplesPage.assertInlineValidationState("NewOrder", undefined, "red");

      await examplesPage.openInlineExample("NewOrder");
      await examplesPage.assertInlineValidationDetails("Invalid Example", true);
      await examplesPage.assertInlineFixActionHidden();

      await expect
        .poll(() => readSpecFile(), { timeout: 15000 })
        .toMatch(/name:\s+NewOrder[\s\S]*?payload:\s+id:\s+101\s+status:\s+invalid/);
    },
  );

  test(
    "renames an inline example and persists the new name to the spec file",
    { tag: ["@async", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = await openExamplesPage(page, eyes, testInfo);
      await examplesPage.renameInlineExample("NewOrder", "RenamedNewOrder");
      await examplesPage.assertInlineExamplesListed(["RenamedNewOrder"]);
      await expect
        .poll(() => readSpecFile(), { timeout: 15000 })
        .toContain("RenamedNewOrder");
    },
  );

  test(
    "deletes an inline example and removes it from the spec file",
    { tag: ["@async", "@examples", "@inlineExamples"] },
    async ({ page, eyes }, testInfo) => {
      const examplesPage = await openExamplesPage(page, eyes, testInfo);
      await examplesPage.deleteInlineExample("CancelledOrder");
      await examplesPage.assertInlineExampleCount("CancelledOrder", 0);
      await expect
        .poll(() => readSpecFile(), { timeout: 15000 })
        .not.toContain("CancelledOrder");
    },
  );
});

async function openExamplesPage(page: import("@playwright/test").Page, eyes: any, testInfo: import("@playwright/test").TestInfo): Promise<ExampleGenerationPage> {
  const examplesPage = new ExampleGenerationPage(page, testInfo, eyes, SPEC, "async");
  await examplesPage.openExampleGenerationTabForSpec(testInfo, eyes, SPEC);
  return examplesPage;
}

function readSpecFile(): string {
  return fs.readFileSync(SPEC_FILE, "utf8");
}
