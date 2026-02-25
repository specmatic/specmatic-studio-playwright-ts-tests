import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_SAVE_INVALID_SPEC } from "../../specNames";
import {
  ServiceSpecConfigPage,
  Edit,
} from "../../../page-objects/service-spec-config-page";

test.describe("InValid Spec save and Error Dialog Display", () => {
  test(
    "Save Invalid Spec and Assert Error",
    { tag: ["@spec", "@invalidSpecChange", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_SAVE_INVALID_SPEC,
      );
      await test.step(`Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_SAVE_INVALID_SPEC}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(
          PRODUCT_SEARCH_BFF_SPEC_SAVE_INVALID_SPEC,
        );
        await configPage.openSpecTab();
      });

      await test.step("Edit Spec and Save", async () => {
        const invalidEdit: Edit[] = [
          {
            current: { mode: "keyOnly", key: "openapi" },
            changeTo: "openapi 3.0.0",
          },
        ];

        await test.step("Introduce syntax error and save", async () => {
          await configPage.editSpec(invalidEdit);
          await configPage.clickSaveOpenApi();
        });

        await test.step("Assert 'Failed to save' dialog", async () => {
          await expect(configPage.alertMsg).toBeVisible();
          const alertText = await configPage.getAlertText();
          expect(alertText).toContain("Failed to save");
        });

        await test.step("Assert validation error details", async () => {
          await expect(configPage.validationErrorBtn).toBeVisible();
          const errorDetail = await configPage.expandAndGetValidationError();
          expect(errorDetail).toContain("Could not parse contract");
          expect(errorDetail).toContain("validate the syntax");
        });
      });
    },
  );
});
