import { test, expect } from "../../../utils/eyesFixture";
import {
  PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_FILTER,
  ORDER_BFF_SERVICE_URL,
} from "../../specNames";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import {
  verifyRightSidebarStatus,
  waitforDialogToDismiss,
} from "../helpers/execute-contract-tests-helper";

test.describe("API Contract Testing - Filtering", () => {
  test(
    "Verify filtering by header",
    { tag: ["@test", "@filterTest", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const contractPage = new ApiContractPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_FILTER,
      );

      await test.step(`Go to Test page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_FILTER}'`, async () => {
        await contractPage.openContractTestTabForSpec(
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_FILTER,
        );
      });

      await test.step("Enter service URL and run contract tests", async () => {
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
        await contractPage.setGenerativeMode(false);
        await contractPage.clickRunContractTests();
        await waitforDialogToDismiss(contractPage, /Tests? complete/i);
        await verifyRightSidebarStatus(
          contractPage,
          "Done",
          PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_FILTER,
        );
      });

      await test.step("Apply and verify filters for test results", async () => {
        const filterTypes = ["success", "failed"];

        for (const filterType of filterTypes) {
          await test.step(`Apply filter: ${filterType} and verify table count`, async () => {
            const expectedCount =
              await contractPage.applyHeaderFilterAndGetExpectedCount(
                filterType,
              );

            if (expectedCount == null) return;

            const tableCount =
              await contractPage.getTableCountByResult(filterType);

            expect(tableCount, `Mismatch for filter "${filterType}"`).toBe(
              expectedCount,
            );
          });
        }
      });
    },
  );
});
