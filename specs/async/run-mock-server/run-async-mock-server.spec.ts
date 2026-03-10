import { test, expect } from "../../../utils/eyesFixture";
import {
  KAFKA_MOCK_SPEC,
  PRODUCT_SEARCH_BFF_SPEC,
  ORDER_BFF_SERVICE_URL,
} from "../../specNames";
import { MockServerPage } from "../../../page-objects/mock-server-page";
import { ApiContractPage } from "../../../page-objects/api-contract-page";

test.describe("Async API Mocking (Kafka)", () => {
  let kafkaMockPage: MockServerPage;
  let contractPage: ApiContractPage;

  test.beforeEach(async ({ page, eyes }, testInfo) => {
    kafkaMockPage = new MockServerPage(page, testInfo, eyes, KAFKA_MOCK_SPEC);
    contractPage = new ApiContractPage(
      page,
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC,
    );
  });

  test(
    "Run Kafka Mock and verify contract tests with in-memory broker",
    { tag: ["@asyncMocking", "@runAsyncMockServer", "@expected-failure"] },
    async () => {
      test.fail(
        true,
        "Inconsistent result in contarct test after starting kafka",
      );
      await startKafkaBroker(kafkaMockPage);

      await runBffContractTests(contractPage);

      await verifyContractTestResults(contractPage);
      await returnToMockAndVerifyResults(kafkaMockPage);
    },
  );
});

async function startKafkaBroker(mockPage: MockServerPage) {
  await test.step(`Flow: Start Kafka Mock Broker for '${KAFKA_MOCK_SPEC}'`, async () => {
    await mockPage.openRunMockServerTab(KAFKA_MOCK_SPEC);
    await mockPage.ensureInMemoryBrokerChecked();
    await mockPage.fillMockPort(9092);
    await mockPage.startMockServer();
    await mockPage.assertAsyncMockStarted("Kafka mock broker: localhost:9092");
  });
}

async function runBffContractTests(contractPage: ApiContractPage) {
  await test.step(`Flow: Run Contract Tests for '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
    await contractPage.openContractTestTabViaSidebar(PRODUCT_SEARCH_BFF_SPEC);
    await contractPage.enterServiceUrl(ORDER_BFF_SERVICE_URL);
    await contractPage.clickRunContractTests();
  });
}

async function returnToMockAndVerifyResults(mockPage: MockServerPage) {
  await test.step(`Flow: Return to Kafka Mock and Validate Summary`, async () => {
    await mockPage.openMockTabViaSidebar(KAFKA_MOCK_SPEC);
    await verifyKafkaMockResults(mockPage);
  });
}

async function verifyContractTestResults(contractPage: ApiContractPage) {
  await test.step("Verify Contract Test Header and Table Integrity", async () => {
    const headerTotals = await contractPage.getSummaryHeaderTotals();
    expect.soft(headerTotals).toStrictEqual({
      success: 17,
      failed: 15,
      error: 0,
      notcovered: 2,
      excluded: 0,
      total: 34,
    });

    const tableHeaderTotals = await contractPage.getAllHeaderTotals();
    const actualRows = await contractPage.getActualRowCount();

    expect.soft(tableHeaderTotals.response).toBe(actualRows);
    expect
      .soft(tableHeaderTotals.path)
      .toBe(await contractPage.getUniqueValuesInColumn(2));
  });
}

async function verifyKafkaMockResults(kafkaMockPage: MockServerPage) {
  await test.step("Verify Kafka Mock Summary and Metadata", async () => {
    // Integrated summary helper
    const headerTotals = await kafkaMockPage.getAsyncMockSummaryHeaderTotals();
    expect.soft(headerTotals).toStrictEqual({
      success: 5,
      failed: 0,
      total: 5,
      error: 0,
      notcovered: 0,
    });

    // Integrated metadata check
    const headers = await kafkaMockPage.getAsyncMockTableHeadersData();
    const expectedMeta = { total: "1", enabled: "1", disabled: "0" };
    expect.soft(headers.operation).toMatchObject({
      text: "Operation",
      ...expectedMeta,
    });
    expect
      .soft(headers.channel)
      .toMatchObject({ text: "Channel", ...expectedMeta });
    expect
      .soft(headers.action)
      .toMatchObject({ text: "Action", ...expectedMeta });
  });
}
