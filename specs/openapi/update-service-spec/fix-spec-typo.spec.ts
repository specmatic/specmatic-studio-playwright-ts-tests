import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_FIX_TYPO } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";

test.describe("Fix Spec Typo - Conditional Update", () => {
  test(
    "Fix /ordres typo to /orders when it exists",
    { tag: ["@spec", "@fixSpecTypo", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_FIX_TYPO,
      );

      await configPage.navigateToSpec(PRODUCT_SEARCH_BFF_SPEC_FIX_TYPO);
      await test.step("Typo detected: Fixing /ordres to /orders", async () => {
        expect(configPage.specFileContains("  /ordres:")).toBeTruthy();

        await configPage.editSpecFile("  /ordres:", "  /orders:");
        await page.reload();

        await configPage.navigateToSpec(PRODUCT_SEARCH_BFF_SPEC_FIX_TYPO);
        await configPage.verifyEndpointInContractTable("/orders");
      });
    },
  );
});
