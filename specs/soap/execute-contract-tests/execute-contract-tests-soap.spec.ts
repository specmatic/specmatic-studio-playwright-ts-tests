import { test, expect } from "../../../utils/eyesFixture";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import {
  INVENTORY_WSDL_CONTRACT_TESTS,
  INVENTROY_SERVICE_URL,
} from "../../specNames";
import { Page, TestInfo } from "playwright/test";

test.describe("SOAP Inventory Contract Testing", () => {
  test(
    "Run and Verify Contract Tests for Inventory WSDL",
    { tag: ["@soap", "@soapContractTest", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const contractPage = await setupContractPage(page, testInfo, eyes);

      await executeInventoryContractTests(contractPage, testInfo, eyes);

      await verifySoapContractSummary(contractPage);

      await verifySoapContractTableHeaders(contractPage);

      await verifySoapActionOperations(contractPage);
    },
  );
});

async function setupContractPage(
  page: Page,
  testInfo: TestInfo,
  eyes: any,
): Promise<ApiContractPage> {
  return new ApiContractPage(
    page,
    testInfo,
    eyes,
    INVENTORY_WSDL_CONTRACT_TESTS,
  );
}

async function executeInventoryContractTests(
  contractPage: ApiContractPage,
  testInfo: any,
  eyes: any,
) {
  await test.step(`Execute Contract Tests for ${INVENTORY_WSDL_CONTRACT_TESTS}`, async () => {
    await contractPage.openContractTestTabForSpec(
      testInfo,
      eyes,
      INVENTORY_WSDL_CONTRACT_TESTS,
    );
    await contractPage.enterServiceUrl(INVENTROY_SERVICE_URL);
    await contractPage.clickRunContractTests();
  });
}

async function verifySoapContractSummary(contractPage: ApiContractPage) {
  await test.step("Verify SOAP Summary Header Totals", async () => {
    const totals = await contractPage.getSoapSummaryHeaderTotals();

    expect(
      totals,
      "Summary counts should match the Inventory WSDL execution results",
    ).toStrictEqual({
      success: 3,
      failed: 0,
      error: 0,
      notcovered: 0,
      total: 3,
    });
  });
}

async function verifySoapContractTableHeaders(contractPage: ApiContractPage) {
  await test.step("Verify SOAP Table Headers (Port and SoapAction)", async () => {
    const portHeaderCount = await contractPage.getTableHeaderCount("port");
    expect(portHeaderCount, "Expected Port header to show count of 1").toBe(1);

    const soapActionHeaderCount =
      await contractPage.getTableHeaderCount("soapAction");
    expect(
      soapActionHeaderCount,
      "Expected SoapAction header to show count of 3",
    ).toBe(3);
  });
}

async function verifySoapActionOperations(contractPage: ApiContractPage) {
  await test.step("Verify Coverage for addInventory, getInventory, and reduceInventory", async () => {
    const rowCount = await contractPage.getActualRowCount();
    const uniqueActions = await contractPage.getUniqueValuesInColumn(2);

    expect(
      rowCount,
      "Total rows should match the 3 operations in the WSDL",
    ).toBe(3);
    expect(
      uniqueActions,
      "Each SOAP operation should be unique in the table",
    ).toBe(3);
  });
}
