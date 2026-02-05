import { test } from "@playwright/test";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";

test.describe("Example Generation", () => {
  test(
    "Generate Valid Examples from API Spec",
    { tag: ["@exampleGeneration"] },
    async ({ page }, testInfo) => {
      const examplePage = new ExampleGenerationPage(page, testInfo);
      await examplePage.goto();
      await examplePage.ensureSidebarOpen();
      await examplePage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await examplePage.clickGenerateExamples();
    },
  );
});
