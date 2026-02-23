import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_BACKWARD_COMPATIBILITY } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";

test.describe("API Specification - Backward Compatibility", () => {
  test(
    "Save Invalid Spec and Assert Error",
    { tag: ["@spec", "@bccTest", "@expected-failure"] },
    async ({ page, eyes }, testInfo) => {
      test.fail(
        true,
        "Known issue in Backward Compatibility Checker - devs need to fix the issue for this test to pass",
      );
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

      await test.step("Should detect and display backward compatibility errors", async () => {
        await configPage.runBackwardCompatibilityTest();
        const toastText = await configPage.getAlertMessageText();
        expect(toastText).toBe("Backward compatibility test failed");
        await configPage.dismissAlert();
      });

      await test.step("Expand Error Details and Verify Content", async () => {
        await configPage.toggleBccErrorSection(true);
        const errorData = await configPage.getBccErrorDetails();

        expect(errorData.summary).toContain("Tests successful");
      });
    },
  );
});
