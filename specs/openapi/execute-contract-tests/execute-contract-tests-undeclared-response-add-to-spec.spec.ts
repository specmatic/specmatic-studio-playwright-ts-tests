import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_UNDECLARED_RESPONSE } from "../../specNames";
import { MockServerPage } from "../../../page-objects/mock-server-page";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import { verifyRightSidebarStatus } from "../helpers/execute-contract-tests-helper";
import fs from "fs";
import path from "path";

test.describe("API Contract Testing - Undeclared Response Add To Spec", () => {
  test(
    "Run contract tests on mock and add undeclared response to specification from drilldown",
    {
      tag: ["@test", "@runContractTests", "@undeclaredResponse", "@eyes"],
    },
    async ({ page, eyes }, testInfo) => {
      const mockPage = new MockServerPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_UNDECLARED_RESPONSE,
      );
      const contractPage = new ApiContractPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_UNDECLARED_RESPONSE,
      );

      let mockUrl: string;
      let selectedRow!: { path: string; method: string; response: string };
      const specFilePath = getSpecFilePath();

      await test.step(`Go to Mock page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_UNDECLARED_RESPONSE}'`, async () => {
        await mockPage.openRunMockServerTab(
          PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_UNDECLARED_RESPONSE,
        );
      });

      await test.step("Start mock server and open contract tests tab", async () => {
        await mockPage.fillMockPort(9999);
        await mockPage.startMockServer();
        mockUrl = await mockPage.getMockURL();
        console.log(
          `[undeclared-response] Mock URL for contract test execution: ${mockUrl}`,
        );

        await mockPage.clickContractTestsTab();
      });

      await test.step("Run contract tests against mock URL", async () => {
        await contractPage.enterServiceUrl(mockUrl);
        await contractPage.clickRunContractTests();
        await verifyRightSidebarStatus(
          contractPage,
          "Done",
          PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_UNDECLARED_RESPONSE,
        );
      });

      await test.step("Open not implemented endpoint drilldown and verify undeclaredResponse qualifier", async () => {
        selectedRow =
          await contractPage.openFirstNotImplementedRemarkDrillDown();
        console.log(
          `[undeclared-response] Drilldown row selected -> path=${selectedRow.path}, method=${selectedRow.method}, response=${selectedRow.response}`,
        );
        await contractPage.verifyQualifierPillVisible("undeclaredresponse");
        await contractPage.expandQualifierPill("undeclaredresponse");
      });

      await test.step("Scroll to response block, click Add to Specification, verify success dialog, and verify spec file update", async () => {
        const specBeforeAdd = fs.readFileSync(specFilePath, "utf-8");

        await contractPage.clickAddToSpecificationInResponse();
        await contractPage.verifyAddToSpecificationSuccessDialog(
          "Updated OpenAPI Specification with new response",
        );

        console.log(
          `[undeclared-response] Added to spec from row -> path=${selectedRow.path}, method=${selectedRow.method}, response=${selectedRow.response}`,
        );

        await expect
          .poll(
            () => fs.readFileSync(specFilePath, "utf-8") !== specBeforeAdd,
            {
              timeout: 15000,
              message:
                "Waiting for fixture spec file to change after Add to Specification",
            },
          )
          .toBe(true);

        const specAfterAdd = fs.readFileSync(specFilePath, "utf-8");
        console.log(
          `[undeclared-response] Spec file changed after add-to-spec: ${specAfterAdd !== specBeforeAdd}`,
        );
      });
    },
  );
});

function getSpecFilePath(): string {
  return path.join(
    process.cwd(),
    "specmatic-studio-demo",
    "specs",
    PRODUCT_SEARCH_BFF_SPEC_CONTRACT_TESTS_UNDECLARED_RESPONSE,
  );
}
