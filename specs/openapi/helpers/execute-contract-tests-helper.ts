import { expect, test } from "../../../utils/eyesFixture";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import { MockServerPage } from "../../../page-objects/mock-server-page";
import { KAFKA_YAML_SPEC } from "../../specNames";

export async function validateSummaryAndTableCounts(
  contractPage: ApiContractPage,
  expected: {
    success: number;
    failed: number;
    total: number;
    error: number;
    notcovered: number;
    excluded: number;
  },
) {
  await test.step("Verify Summary and Table Counts", async () => {
    const tableTotals = await contractPage.getAggregateTableResults();
    const headerTotals = await contractPage.getSummaryHeaderTotals();

    expect(
      tableTotals,
      "Internal Check: Table sum must match Header counts",
    ).toStrictEqual(headerTotals);

    expect(
      headerTotals,
      "Business Check: Header counts must match expected values",
    ).toStrictEqual(expected);
  });
}

export async function withKafkaMockRunning(
  kafkaMockPage: MockServerPage,
  runContractTestsAndAssertCounts: () => Promise<void>,
) {
  await startKafkaMock(kafkaMockPage);

  try {
    await runContractTestsAndAssertCounts();
  } finally {
    await stopKafkaMock(kafkaMockPage);
  }
}

async function startKafkaMock(kafkaMockPage: MockServerPage) {
  await test.step(`Start Kafka mock for contract tests: '${KAFKA_YAML_SPEC}'`, async () => {
    await kafkaMockPage.openRunMockServerTab(KAFKA_YAML_SPEC);
    await kafkaMockPage.ensureInMemoryBrokerChecked();
    await kafkaMockPage.fillMockPort(9092);
    await kafkaMockPage.startMockServer();
    await kafkaMockPage.assertAsyncMockStarted(
      "Kafka mock broker: localhost:9092",
    );
  });
}

async function stopKafkaMock(kafkaMockPage: MockServerPage) {
  await test.step(`Stop Kafka mock after contract tests: '${KAFKA_YAML_SPEC}'`, async () => {
    await kafkaMockPage.openMockTabViaSidebar(KAFKA_YAML_SPEC);
    await kafkaMockPage.stopMockServer();
  });
}

export async function toggleFailedTestViewForTableandRaw(
  contractPage: ApiContractPage,
) {
  const failedCount = await contractPage.getFailedResultsCount(0);

  await expect(contractPage.failedResultCountSpans.nth(0)).toBeVisible();

  await contractPage.clickFailedResults(0);

  await contractPage.verifyFailedScenariosCount(failedCount);

  await expect(contractPage.drillDownScenarios).toHaveCount(failedCount, {
    timeout: 10000,
  });

  await contractPage.toggleScenarioViews(0);

  await contractPage.toggleScenarioViews(failedCount - 1);
}

export async function verifyAllContractRemarks(contractPage: ApiContractPage) {
  // TODO: Add verification for the new /inventory endpoint once the spec is updated

  /* await contractPage.verifyRowRemark(
    "/products",
    "POST",
    "201",
    "covered"
  ); 
  */

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

  await contractPage.verifyRowRemark("/health", "GET", "0", "Missing In Spec");
}

export async function verifyRightSidebarStatus(
  contractPage: ApiContractPage,
  status: "Running" | "Done" | "Failed",
  specName: string,
) {
  await contractPage.rightSidebar.open();
  const actualStatus = await contractPage.getSidebarStatusText(specName);
  expect(actualStatus.toLowerCase()).toBe(status.toLowerCase());
  await contractPage.rightSidebar.close();
}
