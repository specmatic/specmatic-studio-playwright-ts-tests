import { test } from "@playwright/test";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { MockServerPage } from "../../page-objects/mock-server-page";

test.describe("API Mocking", () => {
  test(
    "Run Mock Server for API Spec",
    { tag: ["@apiMocking"] },
    async ({ page }, testInfo) => {
      const mockPage = new MockServerPage(page, testInfo);
      await mockPage.goto();
      await mockPage.ensureSidebarOpen();
      await mockPage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await mockPage.clickRunMockServer();
    },
  );
});
