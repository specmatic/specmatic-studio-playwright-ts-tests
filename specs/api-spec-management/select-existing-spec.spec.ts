import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { SpecmaticStudioPage } from "../../page-objects/specmatic-studio-page";

test.describe("API Specification Management", () => {
  test(
    "Select Existing API Specification",
    { tag: ["@apiSpecManagement", "@selectExistingAPISpec"] },
    async ({ page, eyes }, testInfo) => {
      const studioPage = new SpecmaticStudioPage(page, testInfo, eyes);
      await studioPage.goto();
      await studioPage.openSidebarAndWaitForSpecTree();
      await studioPage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await studioPage.openSpecDetailsTab();
    },
  );
  test(
    "Select Existing Spec",
    { tag: ["@apiSpecManagement", "@selectExistingSpec"] },
    async ({ page, eyes }, testInfo) => {
      const specPage = new SpecmaticStudioPage(page, testInfo, eyes);
      await specPage.goto();
      await specPage.openSidebarAndWaitForSpecTree();
      await specPage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
    },
  );
});
