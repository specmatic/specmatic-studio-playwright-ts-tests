import { test } from "../../../utils/eyesFixture";
import {
  PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
  ORDER_BFF_SERVICE_URL,
} from "../../specNames";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import {
  validateSummaryAndTableCounts,
  verifyRightSidebarStatus,
} from "../helpers/execute-contract-tests-helper";

test.describe(
  "Generative Test Suite - Include/Exclude Combinations",
  {
    tag: ["@test", "@generativeTests"],
  },
  () => {
    let contractPage: ApiContractPage;

    test.beforeEach(async ({ page, eyes }, testInfo) => {
      contractPage = new ApiContractPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
      );

      await test.step(`Setup: Open Test tab for '${PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE}' and set Service URL`, async () => {
        await contractPage.openContractTestTabForSpec(
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
        );
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
      });
    });

    test("Execute generative tests", async () => {
      await test.step("Enable Generative Mode and Run Tests", async () => {
        await contractPage.setGenerativeMode(true);
        await contractPage.clickRunContractTests();
        await verifyRightSidebarStatus(
          contractPage,
          "Done",
          PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
        );

        await validateSummaryAndTableCounts(contractPage, {
          success: 188,
          failed: 32,
          total: 222,
          error: 0,
          notcovered: 2,
          excluded: 0,
        });
      });
    });

    test("Execute generative tests with specific row excluded", async () => {
      await test.step("Exclude specific test row", async () => {
        await contractPage.selectTestForExclusionOrInclusion(
          "/products",
          "POST",
          "201",
        );
        await contractPage.clickExcludeButton();
      });

      await test.step("Enable Generative Mode and Run Tests", async () => {
        await contractPage.setGenerativeMode(true);
        await contractPage.clickRunContractTests();
        await verifyRightSidebarStatus(
          contractPage,
          "Done",
          PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
        );
      });

      await validateSummaryAndTableCounts(contractPage, {
        success: 176,
        failed: 32,
        total: 211,
        error: 0,
        notcovered: 2,
        excluded: 1,
      });
    });
  },
);
