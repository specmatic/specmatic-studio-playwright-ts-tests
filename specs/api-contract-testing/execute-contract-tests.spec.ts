import { test } from "@playwright/test";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
import { ApiContractPage } from "../../page-objects/api-contract-page";

test.describe("API Contract Testing", () => {
  test(
    "Execute Contract Tests for API Spec",
    { tag: ["@apiContract"] },
    async ({ page }, testInfo) => {
      const contractPage = new ApiContractPage(page, testInfo);
      await contractPage.goto();
      await contractPage.ensureSidebarOpen();
      await contractPage.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
      await contractPage.clickExecuteContractTests();
    },
  );
});
