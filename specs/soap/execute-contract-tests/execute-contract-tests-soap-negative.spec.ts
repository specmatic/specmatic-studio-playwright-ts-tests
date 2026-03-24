import { test } from "../../../utils/eyesFixture";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import { INVENTORY_WSDL_CONTRACT_TESTS } from "../../specNames";

const INVALID_SERVICE_URL = "http://localhost:8080";
const INVALID_PORT_URL = "http://inventory-api:9999/ws";
const PREREQ_ERROR_SUMMARY =
  "Tests could not run due to errors in specification or example(s)";

test.describe("SOAP Inventory Contract Testing - Negative Scenarios", () => {
  let contractPage: ApiContractPage;

  test.beforeEach(async ({ page, eyes }, testInfo) => {
    contractPage = new ApiContractPage(
      page,
      testInfo,
      eyes,
      INVENTORY_WSDL_CONTRACT_TESTS,
    );
    await contractPage.openContractTestTabForSpec(
      testInfo,
      eyes,
      INVENTORY_WSDL_CONTRACT_TESTS,
    );
  });

  test(
    "Verify error for invalid SOAP service URL",
    {
      tag: [
        "@soap",
        "@soapContractTest",
        "@negative",
        "@wrongServiceURL",
        "@eyes",
      ],
    },
    async () => {
      await test.step("Enter invalid SOAP service URL", async () => {
        await contractPage.enterServiceUrl(INVALID_SERVICE_URL);
      });

      await test.step("Run SOAP contract tests and expect error", async () => {
        await contractPage.clickRunContractTests(false);
      });

      await test.step("Verify prerequisite error is visible", async () => {
        await contractPage.verifyPrereqErrorVisible(PREREQ_ERROR_SUMMARY);
      });
    },
  );

  test(
    "Verify error for invalid SOAP service port",
    {
      tag: [
        "@soap",
        "@soapContractTest",
        "@negative",
        "@wrongPort",
        "@eyes",
        "@expected-failure",
      ],
    },
    async () => {
      test.fail(
        true,
        "Covergae % inconsistency causing visual validation failure",
      );
      await test.step("Enter SOAP service URL with invalid port", async () => {
        await contractPage.enterServiceUrl(INVALID_PORT_URL);
      });

      await test.step("Run SOAP contract tests and expect error", async () => {
        await contractPage.clickRunContractTests(false);
      });

      await test.step("Verify prerequisite error is visible", async () => {
        await contractPage.verifyPrereqErrorVisible(PREREQ_ERROR_SUMMARY);
      });
    },
  );
});
