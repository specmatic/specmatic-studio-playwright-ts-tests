import { test, expect } from "../../../utils/eyesFixture";
import { INVENTORY_WSDL_MOCK_RUN_SERVER } from "../../specNames";
import { MockServerPage } from "../../../page-objects/mock-server-page";
import { ApiContractPage } from "../../../page-objects/api-contract-page";

test.describe("SOAP API Mocking", () => {
  let mockPage: MockServerPage;
  let contractPage: ApiContractPage;

  test.beforeEach(async ({ page, eyes }, testInfo) => {
    mockPage = new MockServerPage(
      page,
      testInfo,
      eyes,
      INVENTORY_WSDL_MOCK_RUN_SERVER,
    );
    contractPage = new ApiContractPage(
      page,
      testInfo,
      eyes,
      INVENTORY_WSDL_MOCK_RUN_SERVER,
    );
  });

  test(
    "Run Mock Server for SOAP Inventory Spec",
    { tag: ["@soapMocking", "@runSoapMockServer"] },
    async ({ eyes }, testInfo) => {
      await test.step("Setup: Start Mock Server and Configure URL", async () => {
        await mockPage.openRunMockServerTab(INVENTORY_WSDL_MOCK_RUN_SERVER);
        await mockPage.startMockServer();

        const url = await mockPage.getMockURL();
        await mockPage.clickContractTestsTab();
        await mockPage.enterServiceBaseURL(url);
      });

      await test.step("Execution: Run Tests against Mock and Return", async () => {
        await contractPage.clickRunContractTests();
        await mockPage.goBackToMockServerTab();
      });

      await performMockVerifications(mockPage);
    },
  );
});

async function validateSoapMockSummaryAndTableCounts(
  mockPage: MockServerPage,
  expected: {
    success: number;
    failed: number;
    total: number;
    error?: number;
    notcovered?: number;
  },
) {
  const headerTotals = await mockPage.getSoapMockSummaryHeaderTotals();

  expect
    .soft(
      headerTotals,
      "Business Check: SOAP Mock header counts must match expected values",
    )
    .toStrictEqual({
      success: expected.success,
      failed: expected.failed,
      total: expected.total,
      error: expected.error ?? 0,
      notcovered: expected.notcovered ?? 0,
    });
}

async function performMockVerifications(mockPage: MockServerPage) {
  await test.step("Verification: Validate All Mock Results", async () => {
    // Basic Summary Counts
    await validateSoapMockSummaryAndTableCounts(mockPage, {
      success: 3,
      failed: 0,
      total: 3,
      error: 0,
      notcovered: 0,
    });

    // Detailed checks
    await verifyDrillDown(mockPage);
    await validateTableHeaders(mockPage);
    await verifyFilterOperations(mockPage);
  });
}

async function verifyDrillDown(mockPage: MockServerPage) {
  await test.step("Verify Drill-Down Scenarios", async () => {
    await mockPage.clickFirstMockTableRemark();

    const count = await mockPage.getTotalDrillDownCount();
    expect(count, "Drill-down should have at least 1 scenario").toBeGreaterThan(
      0,
    );
    expect
      .soft(
        await mockPage.areAllDrillDownsSuccess(),
        "Expected all drill-down scenarios to be 'Success'",
      )
      .toBe(true);

    const indicesToCheck = count > 1 ? [0, count - 1] : [0];
    for (const index of indicesToCheck) {
      const state = await mockPage.getDrillDownState(index);
      expect
        .soft(
          state.requestVisible,
          "Drill-down request block should be visible",
        )
        .toBe(true);
      expect
        .soft(
          state.responseVisible,
          "Drill-down response block should be visible",
        )
        .toBe(true);
    }

    await mockPage.goBackFromDrillDown();
  });
}

async function validateTableHeaders(mockPage: MockServerPage) {
  await test.step("Validate Port and SoapAction Headers", async () => {
    const headers = await mockPage.getSoapMockTableHeadersData();

    expect.soft(headers.port).toMatchObject({
      text: "Port",
      total: "1",
      enabled: "1",
      disabled: "0",
    });
    expect.soft(headers.soapAction).toMatchObject({
      text: "SoapAction",
      total: "3",
      enabled: "3",
      disabled: "0",
    });
  });
}

async function verifyFilterOperations(mockPage: MockServerPage) {
  await test.step("Verify Mock Filter Operations", async () => {
    for (const filterType of ["success", "total"] as const) {
      const { headerCount, filteredCount } =
        await mockPage.verifyMockFilterCountMatches(filterType);
      expect(
        filteredCount,
        `Table sum should match ${filterType} header count`,
      ).toBe(headerCount);
    }
  });
}
