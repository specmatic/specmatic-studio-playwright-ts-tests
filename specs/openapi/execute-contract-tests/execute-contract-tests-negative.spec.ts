import { test } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../../specNames";
import { ApiContractPage } from "../../../page-objects/api-contract-page";

test.describe("API Contract Testing - Negative Scenarios", () => {
  test.beforeEach(async ({ page, eyes }, testInfo) => {
    test.setTimeout(180000);
    const contractPage = new ApiContractPage(
      page,
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC,
    );

    await contractPage.openContractTestTabForSpec(
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC,
    );
  });

  test(
    "Verify error for invalid service URL",
    { tag: ["@test", "@negative", "@wrongServiceURL"] },
    async ({ page, eyes }, testInfo) => {
      const contractPage = new ApiContractPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
      );
      const invalidUrl = "http://ww.gag.com";

      await contractPage.enterServiceUrl(invalidUrl);

      await contractPage.clickRunContractTests();

      await contractPage.verifyPrereqErrorVisible(
        "Tests could not run due to errors in specification or example(s)",
      );
    },
  );

  test(
    "Verify error for invalid port",
    { tag: ["@test", "@negative", "@wrongPort"] },
    async ({ page, eyes }, testInfo) => {
      const contractPage = new ApiContractPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
      );
      const invalidPortUrl = "http://order-bff:9999";

      await contractPage.enterServiceUrl(invalidPortUrl);
      await contractPage.clickRunContractTests();

      await contractPage.verifyPrereqErrorVisible(
        "Tests could not run due to errors in specification or example(s)",
      );
    },
  );
});
