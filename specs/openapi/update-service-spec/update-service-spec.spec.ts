import { test, expect } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import {
  PRODUCT_SEARCH_BFF_SPEC_UPDATE,
} from "../../specNames";
import {
  ServiceSpecConfigPage,
  Edit,
} from "../../../page-objects/service-spec-config-page";

test.describe("Update Service Spec", () => {
  test(
    "Update Service Specification",
    { tag: ["@spec", "@updateConfig", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_UPDATE,
      );
      await test.step(`Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_UPDATE}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC_UPDATE);
        await configPage.openSpecTab();
      });
      await test.step("Save updated Service Spec", async () => {
        await configPage.clickSaveOpenApi();
        await takeAndAttachScreenshot(page, "save-clicked", eyes);
      });
    },
  );
});
