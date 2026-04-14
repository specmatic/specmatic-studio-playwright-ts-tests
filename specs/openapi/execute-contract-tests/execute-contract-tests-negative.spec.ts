import { test } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_NEGATIVE } from "../../specNames";
import { ApiContractPage } from "../../../page-objects/api-contract-page";

test.describe("API Contract Testing - Negative Scenarios", () => {
  let contractPage: ApiContractPage;

  test.beforeEach(async ({ page, eyes }, testInfo) => {
    contractPage = new ApiContractPage(
      page,
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_NEGATIVE,
    );
    await contractPage.openContractTestTabForSpec(
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_NEGATIVE,
    );
  });

  test(
    "Verify error for invalid service URL",
    {
      tag: [
        "@test",
        "@negative",
        "@wrongServiceURL",
        "@eyes",
        "@expected-faliure",
      ],
    },
    async () => {
      test.fail(
        true,
        "Invalid port/URL executes test instead of throwing a warning",
      );
      const invalidUrl = "http://localhost:3124";

      await test.step("Enter invalid service URL", async () => {
        await contractPage.enterServiceUrl(invalidUrl);
      });

      await test.step("Run contract tests and expect error", async () => {
        await contractPage.clickRunContractTests(false);
      });

      await test.step("Verify prerequisite error is visible", async () => {
        await contractPage.verifyPrereqErrorVisible(
          "Tests could not run due to specification/example errors and governance criteria were not satisfied",
        );
      });
    },
  );

  test(
    "Verify error for invalid port",
    { tag: ["@test", "@negative", "@wrongPort", "@eyes", "@expected-failure"] },
    async () => {
      test.fail(
        true,
        "Invalid port/URL executes test instead of throwing a warning",
      );
      const invalidPortUrl = "http://order-bff:9999";

      await test.step("Enter service URL with invalid port", async () => {
        await contractPage.enterServiceUrl(invalidPortUrl);
      });

      await test.step("Run contract tests and expect error", async () => {
        await contractPage.clickRunContractTests(false);
      });

      await test.step("Verify prerequisite error is visible", async () => {
        await contractPage.verifyPrereqErrorVisible(
          "Tests could not run due to specification/example errors and governance criteria were not satisfied",
        );
      });
    },
  );
});
