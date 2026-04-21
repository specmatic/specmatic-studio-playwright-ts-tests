import { test, expect } from "../../../utils/eyesFixture";
import {
  PRODUCT_SEARCH_BFF_SPEC_FIX_TYPO,
  ORDER_BFF_SERVICE_URL,
} from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import { validateSummaryAndTableCounts } from "../helpers/execute-contract-tests-helper";

test.describe("Fix Spec Typo - Conditional Update", () => {
  test(
    "Fix /ordres typo to /orders when it exists",
    { tag: ["@spec", "@fixSpecTypo", "@eyes", "@expected-failure"] },
    async ({ page, eyes }, testInfo) => {
      test.fail(true, "Network error exits test execution");
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_FIX_TYPO,
      );

      const contractPage = new ApiContractPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_FIX_TYPO,
      );

      await configPage.navigateToSpec(PRODUCT_SEARCH_BFF_SPEC_FIX_TYPO);

      await test.step("Typo detected: Fixing /ordres to /orders", async () => {
        await configPage.editSpecInEditor("  /ordres:", "  /orders:");
        await configPage.clickSaveAfterEdit();
      });

      //TODO: Add Backward Compatibility
      await test.step("Check Backward Compataibility", async () => {
        await configPage.runBackwardCompatibilityTest();
        const toastText = await configPage.getAlertMessageText();
        expect(toastText).toBe("Changes are backward compatible");
        await configPage.dismissAlert();
        await expect(page.locator("#alert-container")).toBeEmpty();
      });
      //TODO: RUn Contract Test and Assert Count
      await test.step("Run contract test for spec with fixed typo and assert count", async () => {
        await configPage.verifyEndpointInContractTable("/orders");
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
        await contractPage.clickRunContractTests();
        await validateSummaryAndTableCounts(contractPage, {
          success: 12,
          failed: 21,
          total: 41,
          error: 0,
          notcovered: 8,
          excluded: 0,
        });
      });
    },
  );
});
