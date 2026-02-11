import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC, ORDER_BFF_SERVICE_URL } from "../specNames";
import { ApiContractPage } from "../../page-objects/api-contract-page";

test.describe("API Contract Testing", () => {
  test(
    "Run contract tests for openapi spec product_search_bff_v5.yaml with default settings and verify test execution status",
    { tag: ["@apiContract", "@runContractTests"] },
    async ({ page, eyes }, testInfo) => {
      test.setTimeout(180000);
      const contractPage = new ApiContractPage(page, testInfo, eyes);

      await test.step(`Go to Test page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
        await contractPage.gotoHomeAndOpenSidebar();
        await contractPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
        await contractPage.openExecuteContractTestsTab();
      });

      await test.step("Enter service URL and run contract tests", async () => {
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
        await contractPage.clickRunContractTests();
      });
      await test.step("Verify test results and remarks for executed contract tests", async () => {
        await contractPage.verifyTestResults();
        await contractPage.verifyRowRemark(
          "/products",
          "POST",
          "201",
          "covered",
        );
        await contractPage.verifyRowRemark(
          "/findAvailableProducts",
          "GET",
          "200",
          /covered/i,
        );
        await contractPage.verifyRowRemark(
          "/ordres",
          "POST",
          "201",
          "not implemented",
        );
        await contractPage.verifyRowRemark(
          "/health",
          "GET",
          "0",
          "Missing In Spec",
        );

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
      await test.step("Identify and Toggle Views for Failed Tests", async () => {
        const rowCount = await contractPage.failedResultCountSpans.count();

        for (let i = 0; i < rowCount; i++) {
          const expectedCount = await contractPage.openFailedResults(i);

          if (expectedCount > 0) {
            await contractPage.verifyFailedScenariosCount(expectedCount);

            await contractPage.toggleScenarioViews(0);

            break;
          }
        }
      });
    },
  );

  test(
    "Exclude specific tests and verify excluded tests are not executed",
    { tag: ["@apiContract", "@testExclusion"] },
    async ({ page, eyes }, testInfo) => {
      test.setTimeout(180000);
      const contractPage = new ApiContractPage(page, testInfo, eyes);
      await test.step(`Go to Test page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
        await contractPage.gotoHomeAndOpenSidebar();
        await contractPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
        await contractPage.openExecuteContractTestsTab();
      });
      await test.step("Enter service URL, exclude tests and run contract tests", async () => {
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);

        await contractPage.selectTestForExclusion("/products", "POST", "201");
        await contractPage.selectTestForExclusion("/products", "POST", "202");

        await contractPage.clickExcludeButton();

        await contractPage.clickRunContractTests();
      });

      await test.step("Verify test results and remarks for executed contract tests", async () => {
        await contractPage.verifyFinalCounts({
          Excluded: 2,
          Total: 15,
        });
      });
    },
  );
});

async function validateSummaryAndTableCounts(
  contractPage: ApiContractPage,
  expected: {
    success: number;
    failed: number;
    total: number;
    error: number;
    notcovered: number;
    excluded: number;
  },
) {
  const tableTotals = await contractPage.getAggregateTableResults();
  const headerTotals = await contractPage.getSummaryHeaderTotals();

  expect(
    tableTotals,
    "Internal Check: Table sum must match Header counts",
  ).toStrictEqual(headerTotals);

  expect(
    headerTotals,
    "Business Check: Header counts must match expected values",
  ).toStrictEqual(expected);
}
