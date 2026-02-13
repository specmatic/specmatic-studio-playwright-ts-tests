import { test, expect } from "../../../utils/eyesFixture";
import {
  PRODUCT_SEARCH_BFF_SPEC,
  ORDER_BFF_SERVICE_URL,
} from "../../specNames";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import {
  validateSummaryAndTableCounts,
  toggleFailedTestViewForTableandRaw,
} from "./execute-contract-tests.utils";

test.describe("API Contract Testing", () => {
  test(
    "Run contract tests for openapi spec product_search_bff_v5.yaml with default settings",
    { tag: ["@test", "@runContractTests"] },
    async ({ page, eyes }, testInfo) => {
      test.setTimeout(180000);
      const contractPage = new ApiContractPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
      );

      await test.step(`Go to Test page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
        await contractPage.openContractTestTabForSpec(
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC,
        );
      });

      await test.step("Enter service URL and run contract tests", async () => {
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
        await contractPage.clickRunContractTests();
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
        ).toBe(await contractPage.getUniqueValuesInColumn(2));

        await validateSummaryAndTableCounts(contractPage, {
          success: 12,
          failed: 20,
          total: 37,
          error: 0,
          notcovered: 5,
          excluded: 0,
        });
      });
      await test.step("Identify and Toggle Views for first and last failed Tests", async () => {
        await toggleFailedTestViewForTableandRaw(contractPage);
      });
    },
  );
});
