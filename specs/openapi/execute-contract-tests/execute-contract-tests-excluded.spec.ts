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

test.describe("API Contract testing with test exclusion and inclusion", () => {
  test(
    "Exclude specific tests and verify excluded tests are not executed",
    { tag: ["@test", "@testExclusion"] },
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
