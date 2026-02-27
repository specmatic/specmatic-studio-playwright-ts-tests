import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_BACKWARD_COMPATIBILITY } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";

test.describe("API Specification", () => {
  test(
    "Backward Compatibility Test",
    { tag: ["@spec", "@bccTest", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_BACKWARD_COMPATIBILITY,
      );
      await test.step(`Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_BACKWARD_COMPATIBILITY}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(
          PRODUCT_SEARCH_BFF_SPEC_BACKWARD_COMPATIBILITY,
        );
        await configPage.openSpecTab();
      });

      await test.step("Remove summary field from /products endpoint and save", async () => {
        await configPage.deleteSpecLinesInEditor("summary: Create a new product", 1);
      });

      await test.step("Should confirm removal of summary is backward compatible", async () => {
        await configPage.runBackwardCompatibilityTest();
        const toastText = await configPage.getAlertMessageText();
        expect(toastText).toBe("Changes are backward compatible");
        await configPage.dismissAlert();
        await expect(page.locator("#alert-container")).toBeEmpty();
      });
    },
  );

});
