import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../../specNames";
import { MockServerPage } from "../../../page-objects/mock-server-page";

test.describe("Mock Server", () => {
  test(
    "Run Mock Server for API Spec",
    { tag: ["@mock"] },
    async ({ page, eyes }, testInfo) => {
      const mockPage = new MockServerPage(page, testInfo, eyes);

      await test.step(`Go to Test page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
        await mockPage.gotoHomeAndOpenSidebar();
        await mockPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
        await mockPage.openRunMockServerTab();
      });
    },
  );
});
