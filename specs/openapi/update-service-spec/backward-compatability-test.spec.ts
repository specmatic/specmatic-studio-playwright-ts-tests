import { test, expect } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import {
  PRODUCT_SEARCH_BFF_SPEC,
  ORDER_BFF_SERVICE_URL,
} from "../../specNames";
import {
  ServiceSpecConfigPage,
  Edit,
} from "../../../page-objects/service-spec-config-page";

test.describe("API Specification - Backward Compatibility", () => {
  test(
    "Scenario 2: Save Invalid Spec and Assert Error",
    { tag: ["@spec", "@bccTest"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
      );
      await test.step(`Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
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

        expect(errorData.summary).toContain("found 1 error");
        expect(errorData.details).toContain(
          "Type (MonitorLink) does not exist",
        );
      });
    },
  );
});
