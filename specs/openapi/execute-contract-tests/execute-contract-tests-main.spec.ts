import { test, expect } from "../../../utils/eyesFixture";
import {
  PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_DEFAULT,
  ORDER_BFF_SERVICE_URL,
} from "../../specNames";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import {
  validateSummaryAndTableCounts,
  toggleFailedTestViewForTableandRaw,
  verifyRightSidebarStatus,
} from "../helpers/execute-contract-tests-helper";

test.describe("API Contract Testing", () => {
  let contractPage: ApiContractPage;

  test.beforeEach(async ({ page, eyes }, testInfo) => {
    contractPage = new ApiContractPage(
      page,
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_DEFAULT,
    );
    await test.step(`Go to Test page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_DEFAULT}'`, async () => {
      await contractPage.openContractTestTabForSpec(
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_DEFAULT,
      );
    });
  });

  test(
    "Run contract tests for openapi spec product_search_bff_v5.yaml with default settings",
    { tag: ["@test", "@runContractTests", "@eyes", "@expected-failure"] },
    async () => {
      test.fail(true, "Network error exits test execution");
      await test.step("Enter service URL and run contract tests", async () => {
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
        await contractPage.clickRunContractTests();

        await contractPage.handlePrereqErrorIfVisible();

        await verifyRightSidebarStatus(
          contractPage,
          "Done",
          PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_DEFAULT,
        );
      });

      await test.step("Verify remark status metrics and skip reason details", async () => {
        await contractPage.verifyRemarkStatusMetrics(
          "/products",
          "POST",
          "202",
          /not implemented/i,
        );

        await contractPage.verifySkipReasonPopover(
          "/products",
          "POST",
          "400",
          "Generative Disabled",
          {
            Path: "/products",
            Method: "POST",
            RequestContentType: "application/json",
            Response: "400",
            ResponseContentType: "application/json",
          },
          [
            {
              ruleId: "T00004: Generative Disabled",
              details:
                "This operation was skipped because it requires schema resiliency to be enabled",
            },
            {
              ruleId: "T00002: Examples Required",
              details:
                "This operation requires examples to run, but none were provided",
            },
          ],
        );

        await contractPage.verifySkipReasonPopover(
          "/findAvailableProducts",
          "GET",
          "429",
          "Examples Required",
          {
            Path: "/findAvailableProducts",
            Method: "GET",
            Response: "429",
          },
          [
            {
              ruleId: "T00002: Examples Required",
              details:
                "This operation requires examples to run, but none were provided",
            },
          ],
        );
      });

      await test.step("Verify test results and remarks for executed contract tests", async () => {
        await contractPage.verifyTestResults();

        //TODO: Fix this Test
        // await verifyAllContractRemarks(contractPage);

        const tableHeaderTotals = await contractPage.getAllHeaderTotals();
        const actualRows = await contractPage.getActualRowCount();

        expect(
          tableHeaderTotals.response,
          "Response header should match total rows",
        ).toBe(actualRows);

        expect(
          tableHeaderTotals.path,
          "Path header should match unique paths in table",
        ).toBe(await contractPage.getUniqueValuesForKey("path"));

        await validateSummaryAndTableCounts(contractPage, {
          success: 12,
          failed: 20,
          total: 39,
          error: 0,
          notcovered: 7,
          excluded: 0,
        });
      });

      await test.step("Identify and Toggle Views for first and last failed Tests", async () => {
        await toggleFailedTestViewForTableandRaw(contractPage);
      });
    },
  );
});
