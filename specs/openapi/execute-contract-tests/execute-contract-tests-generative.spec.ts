import { test } from "../../../utils/eyesFixture";
import {
  PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
  KAFKA_YAML_SPEC,
  ORDER_BFF_SERVICE_URL,
} from "../../specNames";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import { MockServerPage } from "../../../page-objects/mock-server-page";
import {
  validateSummaryAndTableCounts,
  verifyRightSidebarStatus,
  withKafkaMockRunning,
} from "../helpers/execute-contract-tests-helper";

test.describe(
  "Generative Test Suite - Include/Exclude Combinations",
  {
    tag: ["@test", "@generativeTests", "@eyes", "@expected-failure"],
  },
  () => {
    test.fail(
      true,
      "Inconsistent success and failure count for /findAvailableProducts endpoint",
    );
    let contractPage: ApiContractPage;
    let kafkaMockPage: MockServerPage;

    test.beforeEach(async ({ page, eyes }, testInfo) => {
      contractPage = new ApiContractPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
      );
      kafkaMockPage = new MockServerPage(page, testInfo, eyes, KAFKA_YAML_SPEC);
    });

    test("Execute generative tests", async () => {
      await test.step("Enable Generative Mode and Run Tests", async () => {
        await withKafkaMockRunning(kafkaMockPage, async () => {
          await contractPage.openContractTestTabViaSidebar(
            PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
          );
          await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
          await contractPage.setGenerativeMode(true);
          await contractPage.clickRunContractTests();
          await verifyRightSidebarStatus(
            contractPage,
            "Done",
            PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
          );

          await validateSummaryAndTableCounts(contractPage, {
            success: 189,
            failed: 35,
            total: 227,
            error: 0,
            notcovered: 3,
            excluded: 0,
          });
        });
      });
    });

    test("Execute generative tests with specific row excluded", async () => {
      await test.step("Enable Generative Mode and Run Tests", async () => {
        await withKafkaMockRunning(kafkaMockPage, async () => {
          await contractPage.openContractTestTabViaSidebar(
            PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
          );
          await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
          await contractPage.selectTestForExclusionOrInclusion(
            "/products",
            "POST",
            "201",
          );
          await contractPage.clickExcludeButton();
          await contractPage.setGenerativeMode(true);
          await contractPage.clickRunContractTests();
          await verifyRightSidebarStatus(
            contractPage,
            "Done",
            PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_GENERATIVE,
          );

          await validateSummaryAndTableCounts(contractPage, {
            success: 181,
            failed: 31,
            total: 215,
            error: 0,
            notcovered: 3,
            excluded: 1,
          });
        });
      });
    });
  },
);
