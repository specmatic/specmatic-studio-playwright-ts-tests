import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC, ORDER_BFF_SERVICE_URL } from "../specNames";
import { ApiContractPage } from "../../page-objects/api-contract-page";

test.describe.serial("API Contract Testing", () => {
  test(
    "Run contract tests for openapi spec product_search_bff_v5.yaml with default settings and verify test execution status",
    { tag: ["@apiContract", "@runContractTests"] },
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

        await verifyAllContractRemarks(contractPage);

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

  test(
    "Exclude specific tests and verify excluded tests are not executed",
    { tag: ["@apiContract", "@testExclusion"] },
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
      await test.step("Exclude single test", async () => {
        const contractPage = new ApiContractPage(
          page,
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC,
        );

        await contractPage.selectTestForExclusionOrInclusion(
          "/products",
          "POST",
          "201",
        );
        await contractPage.clickExcludeButton();
        await contractPage.clickRunContractTests();

        const tableHeaderTotals = await contractPage.getAllHeaderTotals();

        expect(
          tableHeaderTotals.path,
          "Path header should match unique paths in table",
        ).toBe(await contractPage.getUniqueValuesInColumn(2));

        await validateSummaryAndTableCounts(contractPage, {
          success: 0,
          failed: 20,
          total: 26,
          error: 0,
          notcovered: 5,
          excluded: 1,
        });
      });

      await test.step("Include single test", async () => {
        const contractPage = new ApiContractPage(
          page,
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC,
        );
        await contractPage.selectTestForExclusionOrInclusion(
          "/products",
          "POST",
          "201",
        );
        await contractPage.clickIncludeButton();
        await contractPage.clickRunContractTests();

        const tableHeaderTotals = await contractPage.getAllHeaderTotals();

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

      await test.step("Exclude multiple tests across different endpoints", async () => {
        const contractPage = new ApiContractPage(
          page,
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC,
        );

        await contractPage.selectMultipleTests([
          { path: "/products", method: "POST", response: "201" },
          { path: "/findAvailableProducts", method: "GET", response: "200" },
        ]);
        await contractPage.clickExcludeButton();
        await contractPage.clickRunContractTests();

        const tableHeaderTotals = await contractPage.getAllHeaderTotals();

        expect(
          tableHeaderTotals.path,
          "Path header should match unique paths in table",
        ).toBe(await contractPage.getUniqueValuesInColumn(2));

        await validateSummaryAndTableCounts(contractPage, {
          success: 0,
          failed: 15,
          total: 22,
          error: 0,
          notcovered: 5,
          excluded: 2,
        });
      });

      await test.step("Include multiple tests across different endpoints", async () => {
        const contractPage = new ApiContractPage(
          page,
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC,
        );
        await contractPage.selectMultipleTests([
          { path: "/products", method: "POST", response: "201" },
          { path: "/findAvailableProducts", method: "GET", response: "200" },
        ]);
        await contractPage.clickIncludeButton();
        await contractPage.clickRunContractTests();

        const tableHeaderTotals = await contractPage.getAllHeaderTotals();

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

      await test.step("Verify error when mixing inclusive and exclusive operations", async () => {
        await contractPage.selectTestForExclusionOrInclusion(
          "/products",
          "POST",
          "201",
        );
        await contractPage.clickExcludeButton();

        await contractPage.selectTestForExclusionOrInclusion(
          "/products",
          "POST",
          "201",
        );
        await contractPage.selectTestForExclusionOrInclusion(
          "/products",
          "POST",
          "202",
        );

        const actualErrorMessage =
          await contractPage.getMixedOperationErrorText();

        const expectedMessage =
          "A combination of inclusive and exclusive operations have been selected, Please select only one type";
        expect(actualErrorMessage).toContain(expectedMessage);
      });
    },
  );
});

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
    { tag: ["@apiContract", "@negative", "@wrongServiceURL"] },
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
    { tag: ["@apiContract", "@negative", "@wrongPort"] },
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

test(
  "Verify filtering by header",
  { tag: ["@apiContract", "@filterTest"] },
  async ({ page, eyes }, testInfo) => {
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

    await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
    await contractPage.setGenerativeMode(false);
    await contractPage.clickRunContractTests();

    const filterTypes = ["success", "failed"];

    for (const filterType of filterTypes) {
      const expectedCount =
        await contractPage.applyHeaderFilterAndGetExpectedCount(filterType);

      if (expectedCount == null) return;

      const tableCount = await contractPage.getTableCountByResult(filterType);

      expect(tableCount, `Mismatch for filter "${filterType}"`).toBe(
        expectedCount,
      );
    }
  },
);

test.describe.serial(
  "Generative Test Suite - Include/Exclude Combinations",
  {
    tag: ["@apiContract", "@generativeTests"],
  },
  () => {
    test.setTimeout(180000);
    let contractPage: ApiContractPage;

    test.beforeEach(async ({ page, eyes }, testInfo) => {
      contractPage = new ApiContractPage(
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

      await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
    });

    test("Execute generative tests with specific row excluded", async () => {
      await contractPage.setGenerativeMode(true);
      // await contractPage.selectTestForExclusionOrInclusion("/products", "POST", "201");

      await contractPage.clickRunContractTests();

      await validateSummaryAndTableCounts(contractPage, {
        success: 180,
        failed: 20,
        total: 203,
        error: 0,
        notcovered: 3,
        excluded: 0,
      });
    });
  },
);

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

async function toggleFailedTestViewForTableandRaw(
  contractPage: ApiContractPage,
) {
  const failedCount = await contractPage.getFailedResultsCount(0);

  await expect(contractPage.failedResultCountSpans.nth(0)).toBeVisible();

  await contractPage.clickFailedResults(0);

  await contractPage.verifyFailedScenariosCount(failedCount);

  await expect(contractPage.drillDownScenarios).toHaveCount(failedCount, {
    timeout: 10000,
  });

  await contractPage.toggleScenarioViews(0);

  await contractPage.toggleScenarioViews(failedCount - 1);
}

async function verifyAllContractRemarks(contractPage: ApiContractPage) {
  // TODO: Add verification for the new /inventory endpoint once the spec is updated

  /* await contractPage.verifyRowRemark(
    "/products",
    "POST",
    "201",
    "covered"
  ); 
  */

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

  await contractPage.verifyRowRemark("/health", "GET", "0", "Missing In Spec");
}
