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

test.describe("Saving Valid Spec", () => {
  test(
    "Scenario 1: Save Valid Spec",
    { tag: ["@spec", "@validSpecChange"] },
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

      await test.step("Edit Spec and Save", async () => {
        const validEdit: Edit[] = [
          {
            current: { mode: "keyOnly", key: "title" },
            changeTo: "title: Updated Order BFF",
          },
        ];

        await configPage.editSpec(validEdit);
        await configPage.clickSaveOpenApi();

        await expect(configPage.alertMsg).not.toBeVisible();
      });
    },
  );
});
