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

      await test(
        "Exclude single test",
        { tag: ["@apiContract", "@testExclusion"] },
        async ({ page, eyes }, testInfo) => {
          const contractPage = new ApiContractPage(page, testInfo, eyes);
          // ... setup steps ...
          await contractPage.selectTestForExclusion("/products", "POST", "201");
          await contractPage.clickExcludeButton();
          await contractPage.clickRunContractTests();

          await contractPage.verifyFinalCounts({ Excluded: 1, Total: 15 });
        },
      );
    },
  );

  test(
    "Verify contract test header counts for each column",
    { tag: ["@apiContract", "@summaryValidation"] },
    async ({ page, eyes }, testInfo) => {
      test.setTimeout(180000);
      const contractPage = new ApiContractPage(page, testInfo, eyes);

      await test.step("Setup: Navigate and Run Tests", async () => {
        await contractPage.gotoHomeAndOpenSidebar();
        await contractPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
        await contractPage.openExecuteContractTestsTab();
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
        await contractPage.clickRunContractTests();

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
      });
    },
  );

  test(
    "Verify Header counts match aggregate table data",
    { tag: ["@apiContract", "@headerResultValidation"] },
    async ({ page, eyes }, testInfo) => {
      test.setTimeout(60000);
      const contractPage = new ApiContractPage(page, testInfo, eyes);

      await test.step("Setup and Run", async () => {
        await contractPage.gotoHomeAndOpenSidebar();
        await contractPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
        await contractPage.openExecuteContractTestsTab();
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
        await contractPage.clickRunContractTests();
      });

      await test.step("Validate Results Summary", async () => {
        await validateSummaryAndTableCounts(contractPage, {
          success: 12,
          failed: 20,
          total: 37,
          error: 0,
          notcovered: 5,
          excluded: 0,
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
  // 1. Fetch data from POM
  const tableTotals = await contractPage.getAggregateTableResults();
  const headerSuccess = await contractPage.getSummaryHeaderValue("success");
  const headerFailed = await contractPage.getSummaryHeaderValue("failed");
  const headerTotal = await contractPage.getSummaryHeaderValue("total");
  const headerError = await contractPage.getSummaryHeaderValue("error");
  const headerSkip = await contractPage.getSummaryHeaderValue("notcovered");
  const headerExclude = await contractPage.getSummaryHeaderValue("excluded");

  expect(
    tableTotals.success,
    `Table Sum (${tableTotals.success}) should match Header Success (${headerSuccess})`,
  ).toBe(headerSuccess);

  expect(
    tableTotals.failed,
    `Table Sum (${tableTotals.failed}) should match Header Failed (${headerFailed})`,
  ).toBe(headerFailed);

  expect(
    tableTotals.total,
    `Table Sum (${tableTotals.total}) should match Header Total (${headerTotal})`,
  ).toBe(headerTotal);

  expect(
    tableTotals.error,
    `Table Sum (${tableTotals.error}) should match Header Error (${headerError})`,
  ).toBe(headerError);

  expect(
    tableTotals.notcovered,
    `Table Sum (${tableTotals.notcovered}) should match Header Error (${headerError})`,
  ).toBe(headerSkip);

  expect(
    tableTotals.excluded,
    `Table Sum (${tableTotals.excluded}) should match Header Error (${headerError})`,
  ).toBe(headerExclude);

  // 3. External Assertions: Actual vs Expected
  expect(headerSuccess, `Header Success should be ${expected.success}`).toBe(
    expected.success,
  );
  expect(headerFailed, `Header Failed should be ${expected.failed}`).toBe(
    expected.failed,
  );
  expect(headerTotal, `Header Total should be ${expected.total}`).toBe(
    expected.total,
  );

  expect(headerError, `Header Total should be ${expected.error}`).toBe(
    expected.error,
  );
  expect(headerSkip, `Header Total should be ${expected.notcovered}`).toBe(
    expected.notcovered,
  );
  expect(headerExclude, `Header Total should be ${expected.excluded}`).toBe(
    expected.excluded,
  );
}
