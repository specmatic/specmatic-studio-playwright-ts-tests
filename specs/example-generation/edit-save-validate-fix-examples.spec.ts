import { test, expect } from "../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";
import { Page, TestInfo } from "@playwright/test";
import { Edit } from "../../utils/types/json-edit.types";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { Eyes } from "@applitools/eyes-playwright";

test.describe.serial("Edit, save, validate and fix examples", () => {
  test(
    `Edit, save and validate examples for 'products' path of the '${PRODUCT_SEARCH_BFF_SPEC}' for response codes 200`,
    { tag: ["@exampleGeneration", "@editSaveAndValidate"] },
    async ({ page, eyes }, testInfo) => {
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

      await examplePage.generateExampleAndViewDetailsForPath("products", 201);

      await makeInvalidEditsInExample(examplePage);

      await verifyInvalidExampleDetails(examplePage);

      await fixExampleWithAutoCorrection(examplePage);

      await validateAndSaveEditedExample(examplePage, page, eyes);

      console.log(`Completed test: ${testInfo.title}`);
    },
  );
});

async function validateAndSaveEditedExample(
  examplePage: ExampleGenerationPage,
  page: Page,
  eyes: Eyes,
) {
  await test.step(`Validate the fixed example and verify details`, async () => {
    await examplePage.saveEditedExample();

    const [actualTitleAfterSave, actualMessageAfterSave] =
      await examplePage.getDialogTitleAndMessage();

    expect.soft(actualTitleAfterSave).toBe("Valid Example");
    expect
      .soft(actualMessageAfterSave)
      .toContain(`Example name: products_POST_201_1`);

    await examplePage.closeValidExampleDialog("Valid Example");

    await takeAndAttachScreenshot(
      page,
      "Edited, fixed and validated example",
      eyes,
    );
  });
}

async function fixExampleWithAutoCorrection(
  examplePage: ExampleGenerationPage,
) {
  await test.step(`Fix example with auto-fix and verify details`, async () => {
    await examplePage.fixExampleWithAutoFix();

    const [actualTitleAfterFix, actualMessageAfterFix] =
      await examplePage.getDialogTitleAndMessage();

    expect.soft(actualTitleAfterFix).toBe("Fixed Example");
    expect
      .soft(actualMessageAfterFix)
      .toContain(`Example name: products_POST_201_1`);

    await examplePage.closeFixedExampleDialog("Fixed Example");
  });
}

async function verifyInvalidExampleDetails(examplePage: ExampleGenerationPage) {
  await test.step(`Verify invalid example details`, async () => {
    const [actualTitle, actualMessage] =
      await examplePage.getDialogTitleAndMessage();

    expect.soft(actualTitle).toBe("Invalid Example");
    expect.soft(actualMessage).toContain(`Example name: products_POST_201_1`);

    await examplePage.closeInvalidExampleDialog("Invalid Example");

    const [errorCount, errorBlob] =
      await examplePage.getDetailsOfErrorsInExample();
    console.log(
      "Validation errors in example:",
      JSON.stringify({ errorCount, errorBlob }, null, 2),
    );

    expect.soft(errorCount).toBe(2);
    expect
      .soft(errorBlob)
      .toContain(
        `Property "inventoy" in the example was not in the specification. Did you mean "inventory"?`,
      );
    expect
      .soft(errorBlob)
      .toContain(
        `Property "idty" in the example was not in the specification. Did you mean "id"?"?`,
      );
  });
}

async function makeInvalidEditsInExample(examplePage: ExampleGenerationPage) {
  await test.step(`Make invalid edits in example`, async () => {
    const edits: Edit[] = [
      {
        current: { mode: "keyAndAnyNumber", key: "inventory" },
        changeTo: '"inventy": "10"',
      },
      {
        current: { mode: "keyAndAnyNumber", key: "id" },
        changeTo: '"idty": "abc"',
      },
    ];
    await examplePage.editExample(edits);
    await examplePage.saveEditedExample();
  });
}
