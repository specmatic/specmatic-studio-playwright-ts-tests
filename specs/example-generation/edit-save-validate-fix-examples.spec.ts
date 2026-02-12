import { test, expect } from "../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";
import { Page, TestInfo } from "@playwright/test";
import { Edit } from "../../utils/types/json-edit.types";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";

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
      const [actualTitle, actualMessage] =
        await examplePage.getDialogTitleAndMessage();

      expect.soft(actualTitle).toBe("Invalid Example");
      expect.soft(actualMessage).toContain(`Example name: products_POST_201_1`);

      await examplePage.closeInvalidExampleDialog("Invalid Example");
      const validationErrors = await examplePage.getDetailsOfErrorsInExample();
      console.log(
        "Validation errors in example:",
        JSON.stringify(validationErrors, null, 2),
      );

    //   expect.soft(validationErrors.length).toBe(2);
    //   expect.soft(validationErrors[0].location).toBe("response body");
    //   expect.soft(validationErrors[0].code).toBe("YAMLException");
    //   expect
    //     .soft(validationErrors[0].summary)
    //     .toBe("Bad indentation of a mapping entry");
    //   expect
    //     .soft(validationErrors[0].details)
    //     .toContain("at line 15, column 11:");

      await examplePage.fixExampleWithAutoFix();

      const [actualTitleAfterFix, actualMessageAfterFix] =
        await examplePage.getDialogTitleAndMessage();

      expect.soft(actualTitleAfterFix).toBe("Fixed Example");
      expect
        .soft(actualMessageAfterFix)
          .toContain(`Example name: products_POST_201_1`);
        
        await examplePage.closeFixedExampleDialog("Fixed Example");

        await examplePage.saveEditedExample();

        const [actualTitleAfterSave, actualMessageAfterSave] =
          await examplePage.getDialogTitleAndMessage();

        expect.soft(actualMessageAfterSave).toBe("Valid Example");
        expect
          .soft(actualMessageAfterSave)
            .toContain(`Example name: products_POST_201_1`);
        
        await examplePage.closeValidExampleDialog("Valid Example");

        await takeAndAttachScreenshot(page, "Edited, fixed and validated example", eyes);

        console.log(`Completed test: ${testInfo.title}`);
    },
  );
});