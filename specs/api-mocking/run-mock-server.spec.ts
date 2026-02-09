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

      await test.step(`Go to Test page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
        await test.step("Open sidebar", async () => {
          await mockPage.goto();
          await mockPage.ensureSidebarOpen();
        });
        await test.step(`Navigate to Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
          await mockPage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
        });
        await test.step("Go to Mock Server", async () => {
          await mockPage.clickRunMockServer();
        });
      });
    },
  );
});
