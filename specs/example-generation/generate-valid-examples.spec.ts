import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";

test.describe("Example Generation", () => {
  test(
    "Generate Valid Examples from API Spec",
    { tag: ["@exampleGeneration"] },
    async ({ page, eyes }, testInfo) => {
      const examplePage = new ExampleGenerationPage(page, testInfo, eyes);
      await examplePage.goto();
      await examplePage.ensureSidebarOpen();
      await examplePage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await examplePage.clickGenerateExamples();
    },
  );
});
