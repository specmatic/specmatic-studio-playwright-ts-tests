import { test, expect } from "../../../utils/eyesFixture";
import {
  PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_STOP,
  ORDER_BFF_SERVICE_URL,
} from "../../specNames";
import { ApiContractPage } from "../../../page-objects/api-contract-page";

test.describe("API Contract Testing - Stop Execution", () => {
  test(
    "Run contract tests and stop immediately, then verify halt dialog and summary header counts",
    { tag: ["@test", "@runContractTests", "@stop", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const contractPage = new ApiContractPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_STOP,
      );

      await test.step(
        `Go to contract test tab for '${PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_STOP}'`,
        async () => {
          await contractPage.openContractTestTabForSpec(
            testInfo,
            eyes,
            PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_STOP,
          );
        },
      );

      await test.step("Enter service URL and run then stop immediately", async () => {
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
        await contractPage.clickRunAndStopContractTestsImmediately();
      });

      await test.step("Verify execution halted by user dialog", async () => {
        await contractPage.verifyExecutionHaltedDialog(
          "Execution halted by user",
        );
      });

      await test.step("Verify summary header counts after stop", async () => {
        const totals = await contractPage.getSummaryHeaderTotals();
        console.log(
          `[stop-contract-tests] summary totals after stop -> success=${totals.success}, failed=${totals.failed}, notcovered=${totals.notcovered}, excluded=${totals.excluded}, total=${totals.total}`,
        );

        expect(
          totals.total,
          "Total summary count should be populated after stop",
        ).toBeGreaterThan(0);

        expect(
          totals.success + totals.failed + totals.notcovered + totals.excluded,
          "Summary buckets should add up to total after stop",
        ).toBe(totals.total);
      });
    },
  );
});
