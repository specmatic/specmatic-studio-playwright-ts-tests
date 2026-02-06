import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { MockServerPage } from "../../page-objects/mock-server-page";

test.describe("API Mocking", () => {
  test(
    "Run Mock Server for API Spec",
    { tag: ["@apiMocking"] },
    async ({ page, eyes }, testInfo) => {
      const mockPage = new MockServerPage(page, testInfo, eyes);
      await mockPage.goto();
      await mockPage.ensureSidebarOpen();
      await mockPage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await mockPage.clickRunMockServer();
    },
  );
});
