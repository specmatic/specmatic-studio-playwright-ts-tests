import fs from "node:fs";
import path from "node:path";
import { expect, test } from "../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";

type ConversionSuite = {
  title: string;
  spec: string;
  protocol: "openapi" | "async";
  externalNames: {
    copy: string;
    move: string;
    warning?: string;
    unimportable: string;
  };
  warningReason?: RegExp;
  unimportableReason: RegExp;
};

export function defineExampleConversionTests(config: ConversionSuite): void {
  const specFile = path.join(process.cwd(), "specmatic-studio-demo", "specs", config.spec);
  const examplesDir = specFile.replace(/\.(yaml|yml)$/, "_examples");
  const inlineName = (fileName: string) => fileName.replace(/\.json$/, "");

  test.describe(`${config.title} example import and export`, () => {
    test(
      "imports external examples with copy and move semantics and safely skips unimportable examples",
      { tag: ["@examples", "@exampleConversion", `@${config.protocol}`] },
      async ({ page, eyes }, testInfo) => {
        const examplesPage = await openExamplesPage(page, eyes, testInfo, config);
        const { copy, move, unimportable, warning } = config.externalNames;

        await examplesPage.assertExternalExampleCount(copy, 1);
        await examplesPage.assertExternalExampleCount(move, 1);
        await examplesPage.assertExternalExampleCount(unimportable, 1);
        if (warning) await examplesPage.assertExternalExampleCount(warning, 1);

        await examplesPage.selectExampleForConversion(copy, "External");
        await examplesPage.selectExampleForConversion(move, "External");
        await examplesPage.selectExampleForConversion(unimportable, "External");
        if (warning) await examplesPage.selectExampleForConversion(warning, "External");
        await examplesPage.openExampleConversionDialog("import");

        await examplesPage.assertExampleConversionModes(copy, ["COPY", "MOVE"]);
        await examplesPage.assertExampleConversionModes(move, ["COPY", "MOVE"]);
        await examplesPage.assertExampleConversionModes(unimportable, ["SKIP"]);
        await examplesPage.assertExampleConversionRow(unimportable, "error", config.unimportableReason);

        await examplesPage.chooseExampleConversionMode(copy, "COPY");
        await examplesPage.chooseExampleConversionMode(move, "MOVE");
        await examplesPage.chooseExampleConversionMode(unimportable, "SKIP");

        if (warning && config.warningReason) {
          await examplesPage.assertExampleConversionModes(warning, ["COPY", "MOVE", "SKIP"]);
          await examplesPage.assertExampleConversionRow(warning, "warning", config.warningReason);
          await examplesPage.chooseExampleConversionMode(warning, "COPY");
        }

        await examplesPage.confirmExampleConversion();
        await expect.poll(() => fs.existsSync(path.join(examplesDir, copy))).toBeTruthy();
        await expect.poll(() => fs.existsSync(path.join(examplesDir, move))).toBeFalsy();
        await expect.poll(() => fs.existsSync(path.join(examplesDir, unimportable))).toBeTruthy();

        await examplesPage.assertInlineExampleCount(inlineName(copy), 1);
        await examplesPage.assertInlineExampleCount(inlineName(move), 1);
        await examplesPage.assertInlineExampleCount(inlineName(unimportable), 0);

        if (warning) {
          await expect.poll(() => fs.existsSync(path.join(examplesDir, warning))).toBeTruthy();
          await examplesPage.assertInlineExampleCount(inlineName(warning), 1);
        }
      },
    );

    test(
      "exports inline examples with copy and move semantics",
      { tag: ["@examples", "@exampleConversion", `@${config.protocol}`] },
      async ({ page, eyes }, testInfo) => {
        const examplesPage = await openExamplesPage(page, eyes, testInfo, config);

        await examplesPage.selectExampleForConversion("InlineCopy", "Inline");
        await examplesPage.selectExampleForConversion("InlineMove", "Inline");
        await examplesPage.openExampleConversionDialog("export");
        await examplesPage.assertExampleConversionModes("InlineCopy", ["COPY", "MOVE"]);
        await examplesPage.assertExampleConversionModes("InlineMove", ["COPY", "MOVE"]);
        await examplesPage.chooseExampleConversionMode("InlineCopy", "COPY");
        await examplesPage.chooseExampleConversionMode("InlineMove", "MOVE");
        await examplesPage.confirmExampleConversion();

        await expect.poll(() => fs.existsSync(path.join(examplesDir, "InlineCopy.json"))).toBeTruthy();
        await expect.poll(() => fs.existsSync(path.join(examplesDir, "InlineMove.json"))).toBeTruthy();
        await examplesPage.assertInlineExampleCount("InlineCopy", 1);
        await examplesPage.assertInlineExampleCount("InlineMove", 0);
        await examplesPage.assertExternalExampleCount("InlineCopy", 1);
        await examplesPage.assertExternalExampleCount("InlineMove", 1);
      },
    );
  });
}

async function openExamplesPage(
  page: import("@playwright/test").Page,
  eyes: any,
  testInfo: import("@playwright/test").TestInfo,
  config: ConversionSuite,
): Promise<ExampleGenerationPage> {
  const examplesPage = new ExampleGenerationPage(page, testInfo, eyes, config.spec, config.protocol);
  await examplesPage.openExampleGenerationTabForSpec(testInfo, eyes, config.spec);
  return examplesPage;
}
