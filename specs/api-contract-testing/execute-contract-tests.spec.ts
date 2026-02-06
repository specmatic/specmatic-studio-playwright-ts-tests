import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specNames";
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
});
