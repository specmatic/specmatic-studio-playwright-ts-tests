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

      await test.step(`Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
        await studioPage.gotoHomeAndOpenSidebar();
        await studioPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
        await studioPage.openSpecTab();
      });
    },
  );
});
