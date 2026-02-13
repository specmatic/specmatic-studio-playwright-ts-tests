import { test } from "../../../utils/eyesFixture";
import {
  PRODUCT_SEARCH_BFF_SPEC,
  ORDER_BFF_SERVICE_URL,
} from "../../specNames";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import { validateSummaryAndTableCounts } from "./execute-contract-tests.utils";

test.describe(
  "Generative Test Suite - Include/Exclude Combinations",
  {
    tag: ["@test", "@generativeTests"],
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

      await test.step(`Setup: Open Test tab for '${PRODUCT_SEARCH_BFF_SPEC}' and set Service URL`, async () => {
        await contractPage.openContractTestTabForSpec(
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC,
        );
        await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
      });
    });

    test("Execute generative tests with specific row excluded", async () => {
      await contractPage.selectTestForExclusionOrInclusion(
        "/products",
        "POST",
        "201",
      );
      await contractPage.clickExcludeButton();
      await test.step("Enable Generative Mode and Run Tests", async () => {
        await contractPage.setGenerativeMode(true);
        await contractPage.clickRunContractTests();
      });

      await test.step("Verify Summary and Table Counts", async () => {
        await validateSummaryAndTableCounts(contractPage, {
          success: 180,
          failed: 20,
          total: 203,
          error: 0,
          notcovered: 3,
          excluded: 0,
        });
      });
    });
  },
);
