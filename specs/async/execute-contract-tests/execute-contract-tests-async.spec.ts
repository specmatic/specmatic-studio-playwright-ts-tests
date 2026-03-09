import { test, expect } from "../../../utils/eyesFixture";
import { KAFKA_CONTRACT_TESTS } from "../../specNames";
import { MockServerPage } from "../../../page-objects/mock-server-page";
import { ApiContractPage } from "../../../page-objects/api-contract-page";

test.describe("Kafka Spec — Self-Contract Testing", () => {
  let kafkaPage: MockServerPage;
  let contractPage: ApiContractPage;

  test.beforeEach(async ({ page, eyes }, testInfo) => {
    kafkaPage = new MockServerPage(page, testInfo, eyes, KAFKA_CONTRACT_TESTS);
    contractPage = new ApiContractPage(
      page,
      testInfo,
      eyes,
      KAFKA_CONTRACT_TESTS,
    );
  });

  test(
    "Run Kafka Mock and verify its own Contract Tests",
    { tag: ["@kafka", "@asyncContractTest"] },
    async () => {
      await startKafkaBrokerAndRunTests(kafkaPage, contractPage);
      await verifyKafkaContractResults(contractPage);
      await verifyKafkaMockResultsAcrossTabs(kafkaPage);
    },
  );
});

async function startKafkaBrokerAndRunTests(
  mockPage: MockServerPage,
  contractPage: ApiContractPage,
) {
  await test.step("Flow: Start Kafka Broker and Execute Tests", async () => {
    await mockPage.openRunMockServerTab(KAFKA_CONTRACT_TESTS);
    await mockPage.ensureInMemoryBrokerChecked();
    await mockPage.fillMockPort(9092);
    await mockPage.startMockServer();
    await mockPage.assertAsyncMockStarted("Kafka mock broker: localhost:9092");

    await contractPage.openContractTestTabForAsync();
    await contractPage.clickAsyncRunContractTests();
  });
}

async function verifyKafkaMockResultsAcrossTabs(mockPage: MockServerPage) {
  await test.step("Flow: Return to Mock Tab and Verify Data", async () => {
    await mockPage.openMockTabViaSidebar(KAFKA_CONTRACT_TESTS);

    await validateAsyncMockSummaryAndTableCounts(mockPage, {
      success: 1,
      failed: 0,
      total: 1,
    });

    await verifyKafkaMockTableHeaders(mockPage);
  });
}

async function verifyKafkaContractResults(contractPage: ApiContractPage) {
  await test.step("Verify Kafka Contract Test Results", async () => {
    const headerTotals = await contractPage.getAsyncSummaryHeaderTotals();

    expect(
      headerTotals,
      "Contract test results for Kafka should be fully successful",
    ).toStrictEqual({
      success: 1,
      failed: 0,
      error: 0,
      notcovered: 0,
      total: 1,
      excluded: 0,
    });
  });
}

async function validateAsyncMockSummaryAndTableCounts(
  mockPage: MockServerPage,
  expected: {
    success: number;
    failed: number;
    total: number;
    error?: number;
    notcovered?: number;
  },
) {
  const headerTotals = await mockPage.getAsyncMockSummaryHeaderTotals();

  expect(
    headerTotals,
    "Async Mock header counts must match expected values",
  ).toStrictEqual({
    success: expected.success,
    failed: expected.failed,
    total: expected.total,
    error: expected.error ?? 0,
    notcovered: expected.notcovered ?? 0,
    excluded: 0,
  });
}

async function verifyKafkaMockTableHeaders(mockPage: MockServerPage) {
  const headers = await mockPage.getAsyncMockTableHeadersData();
  const expected = { total: "1", enabled: "1", disabled: "0" };

  expect(headers.operation).toMatchObject({ text: "Operation", ...expected });
  expect(headers.channel).toMatchObject({ text: "Channel", ...expected });
  expect(headers.action).toMatchObject({ text: "Action", ...expected });
}
