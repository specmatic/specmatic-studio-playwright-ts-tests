import { test } from "@playwright/test";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { SpecmaticStudioPage } from "../../page-objects/specmatic-studio-page";

test.describe("API Specification Management", () => {
  test(
    "Select Existing API Specification",
    { tag: ["@apiSpecManagement"] },
    async ({ page }, testInfo) => {
      const studioPage = new SpecmaticStudioPage(page, testInfo);
      await studioPage.goto();
      await studioPage.ensureSidebarOpen();
      await studioPage.waitForSpecTree();
      await studioPage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await studioPage.openSpecDetailsTab();
    },
  );
});
