import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";

const SERVICE_URL = "http://order-bff:8080";
import { ApiContractPage } from "../../page-objects/api-contract-page";

test.describe("API Contract Testing", () => {
  test(
    "Execute Contract Tests for API Spec",
    { tag: ["@apiContract"] },
    async ({ page, eyes }, testInfo) => {
      const contractPage = new ApiContractPage(page, testInfo, eyes);
      await contractPage.goto();
      await contractPage.ensureSidebarOpen();
      await contractPage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await contractPage.clickExecuteContractTests();
    },
  );

  test(
    "Run contract tests for openapi spec product_search_bff_v5.yaml with default settings and verify test execution status",
    { tag: ["@apiContract", "@runContractTests"] },
    async ({ page, eyes }, testInfo) => {
      test.setTimeout(180000);
      const contractPage = new ApiContractPage(page, testInfo, eyes);
      await contractPage.goto();
      await contractPage.ensureSidebarOpen();
      await contractPage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await contractPage.clickExecuteContractTests();
      await contractPage.enterServiceUrl(SERVICE_URL);
      await contractPage.clickRunContractTests();
      await contractPage.waitForTestCompletion();
      await contractPage.verifyTestResults();
      await contractPage.verifyRowRemark("/products", "POST", "201", "covered");
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
    },
  );

  test(
    "Exclude specific tests and verify excluded tests are not executed",
    { tag: ["@apiContract", "@testExclusion"] },
    async ({ page, eyes }, testInfo) => {
      test.setTimeout(180000);
      const contractPage = new ApiContractPage(page, testInfo, eyes);
      await contractPage.goto();
      await contractPage.ensureSidebarOpen();
      await contractPage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await contractPage.clickExecuteContractTests();
      await contractPage.enterServiceUrl(SERVICE_URL);

      await contractPage.selectTestForExclusion("/products", "POST", "201");
      await contractPage.selectTestForExclusion("/products", "POST", "202");

      await contractPage.clickExcludeButton();

      await contractPage.clickRunContractTests();
      await contractPage.waitForTestCompletion();

      await contractPage.verifyFinalCounts({
        Excluded: 2,
        Total: 15,
      });
    },
  );
});
