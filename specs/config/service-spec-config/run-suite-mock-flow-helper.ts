import { expect, test } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import { MockServerPage } from "../../../page-objects/mock-server-page";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { validateSummaryAndTableCounts } from "../../openapi/helpers/execute-contract-tests-helper";
import {
  PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK,
  SPECMATIC_CONFIG,
} from "../../specNames";
import { Page, TestInfo } from "playwright/test";

export const MOCK_BACKED_RUNNING_LOG_LINES = [
  "[CONFIG] Loaded specmatic.yaml",
  "[MOCK] Starting mock: kafka.yaml",
  "[TEST] Running configured tests",
];

export const V2_MOCK_BACKED_RUNNING_LOG_LINES = [
  "[CONFIG] Loaded specmatic.yaml",
  "[MOCK] Starting mock: kafka.yaml",
  "[MOCK] Starting mock: inventory.wsdl",
  "[TEST] Running configured tests",
];

const EXPECTED_CONTRACT_SUMMARY_TOTALS = {
  success: 19,
  failed: 0,
  error: 0,
  notcovered: 0,
  excluded: 0,
  total: 19,
};

type MockBackedRunOptions = {
  page: Page;
  eyes: any;
  testInfo: TestInfo;
  seedConfig?: () => void;
  originalBaseUrlReference: string;
  originalSpecReference: string;
  updatedSpecReference: string;
  runningLogLines: string[];
  buildCompletedLogLines: (mockUrl: string) => string[];
  runningScreenshotName: string;
  completedScreenshotName: string;
  terminalState?: "error" | "success";
  terminalStatus?: string;
};

export function createMockFlowPages(page: Page, eyes: any, testInfo: TestInfo) {
  return {
    mockPage: new MockServerPage(
      page,
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK,
    ),
    configPage: new ServiceSpecConfigPage(
      page,
      testInfo,
      eyes,
      SPECMATIC_CONFIG,
    ),
    contractPage: new ApiContractPage(
      page,
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK,
    ),
  };
}

export function buildCompletedLogLines(mockUrl: string) {
  return [
    "[CONFIG] Loaded specmatic.yaml (tests=1, mocks=1)",
    "[MOCK] Starting mock: kafka.yaml (port=9092)",
    "[MOCK] Started mock: kafka.yaml",
    "[READY] Waiting for readiness: kafka.yaml",
    "[READY] Mock ready: kafka.yaml",
    "[TEST] Running configured tests",
    `[TEST] Starting contract tests: ${PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK} (baseUrl=${mockUrl})`,
    `[TEST] Completed contract tests: ${PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK}`,
    "[TEST] All configured tests completed",
    "[CLEANUP] Stopping 1 started mock(s)",
    "[CLEANUP] Cleanup complete",
    "Execution complete",
  ];
}

export function buildV2CompletedLogLines(mockUrl: string) {
  return [
    "[CONFIG] Loaded specmatic.yaml (tests=1, mocks=2)",
    "[MOCK] Starting mock: kafka.yaml (port=9092)",
    "[MOCK] Started mock: kafka.yaml",
    "[READY] Waiting for readiness: kafka.yaml",
    "[READY] Mock ready: kafka.yaml",
    "[MOCK] Starting mock: inventory.wsdl (port=8095)",
    "[MOCK] Started mock: inventory.wsdl",
    "[READY] Waiting for readiness: inventory.wsdl",
    "[READY] Mock ready: inventory.wsdl",
    "[TEST] Running configured tests",
    `[TEST] Starting contract tests: ${PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK} (baseUrl=${mockUrl})`,
    `[TEST] Completed contract tests: ${PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK}`,
    "[TEST] All configured tests completed",
    "[CLEANUP] Stopping 2 started mock(s)",
    "[CLEANUP] Cleanup complete",
    "Execution complete",
  ];
}

export async function startMockAndExtractUrl(mockPage: MockServerPage) {
  let mockUrl = "";

  await test.step(`Open '${PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK}' and start the mock`, async () => {
    await mockPage.openRunMockServerTab(PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK);
    await mockPage.startMockServer();
    await mockPage.verifySidebarStatus(
      PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK,
      "Running",
    );
    mockUrl = await mockPage.getMockURL();
  });

  return mockUrl;
}

export async function updateConfigForMock(
  configPage: ServiceSpecConfigPage,
  mockUrl: string,
  originalBaseUrlReference: string,
  originalSpecReference: string,
  updatedSpecReference: string,
) {
  await test.step("Update specmatic.yaml to use the mock URL and mock-backed contract spec", async () => {
    await configPage.sideBar.selectSpec(SPECMATIC_CONFIG);
    await configPage.openSpecTab();
    await configPage.editSpecInEditor(
      originalBaseUrlReference,
      originalBaseUrlReference.replace("http://order-bff:8080", mockUrl),
    );
    await configPage.editSpecInEditor(
      originalSpecReference,
      updatedSpecReference,
    );
    await configPage.clickSaveAfterEdit();
  });
}

export async function runSuite(configPage: ServiceSpecConfigPage) {
  await test.step("Run Suite", async () => {
    await configPage.clickRunSuite();
    await configPage.rightSidebar.close();
  });
}

export async function assertMockBackedContractSummary(
  contractPage: ApiContractPage,
) {
  await test.step("Verify contract test summary totals for the mock-backed spec", async () => {
    await contractPage.openContractTestTabViaSidebar(
      PRODUCT_SEARCH_BFF_SPEC_CONFIG_MOCK,
    );
    await validateSummaryAndTableCounts(
      contractPage,
      EXPECTED_CONTRACT_SUMMARY_TOTALS,
    );
  });
}

export async function runMockBackedConfigFlow({
  page,
  eyes,
  testInfo,
  seedConfig,
  originalBaseUrlReference,
  originalSpecReference,
  updatedSpecReference,
  runningLogLines,
  buildCompletedLogLines,
  runningScreenshotName,
  completedScreenshotName,
  terminalState = "success",
  terminalStatus = "Completed",
}: MockBackedRunOptions) {
  const { mockPage, configPage, contractPage } = createMockFlowPages(
    page,
    eyes,
    testInfo,
  );

  const mockUrl = await startMockAndExtractUrl(mockPage);
  seedConfig?.();
  await updateConfigForMock(
    configPage,
    mockUrl,
    originalBaseUrlReference,
    originalSpecReference,
    updatedSpecReference,
  );
  await runSuite(configPage);
  await expectExecutionState(
    configPage,
    page,
    eyes,
    "running",
    "Running",
    runningLogLines,
    runningScreenshotName,
  );
  await configPage.waitForExecutionToComplete();
  await expectExecutionState(
    configPage,
    page,
    eyes,
    terminalState,
    terminalStatus,
    buildCompletedLogLines(mockUrl),
    completedScreenshotName,
  );
  await assertMockBackedContractSummary(contractPage);
}

export async function expectExecutionState(
  configPage: ServiceSpecConfigPage,
  page: Page,
  eyes: any,
  state: "error" | "success" | "running",
  expectedStatus: string,
  expectedLogLines: string[],
  screenshotName: string,
) {
  await test.step(`Execution progress shows '${expectedStatus}'`, async () => {
    await assertExecutionDropDown(
      configPage,
      page,
      eyes,
      state,
      expectedStatus,
    );
    await expectExecutionLog(configPage, expectedLogLines);
    await takeAndAttachScreenshot(page, screenshotName, eyes);
  });
}

async function expectExecutionLog(
  configPage: ServiceSpecConfigPage,
  expectedLogLines: string[],
) {
  try {
    await expect
      .poll(
        async () => {
          const logText = await configPage.executionLog.innerText();
          return expectedLogLines.every((line) => logText.includes(line));
        },
        {
          timeout: 15000,
          intervals: [500, 1000, 2000],
          message: `Execution log did not contain all expected lines: ${expectedLogLines.join(" | ")}`,
        },
      )
      .toBe(true);
  } catch {
    const logText = await configPage.executionLog.innerText().catch(() => "");
    for (const line of expectedLogLines) {
      expect
        .soft(logText.includes(line), `Execution log should contain: ${line}`)
        .toBe(true);
    }
  }
}

async function assertExecutionDropDown(
  configPage: ServiceSpecConfigPage,
  page: Page,
  eyes: any,
  state: "error" | "success" | "running",
  expectedStatus: string,
) {
  const dropdown = configPage.executionProgressDropdown;

  await expect(dropdown).toBeVisible({ timeout: 10000 });
  try {
    await expect(dropdown).toHaveAttribute("data-state", state, {
      timeout: 15000,
    });
  } catch {
    expect.soft(await dropdown.getAttribute("data-state")).toBe(state);
  }
  expect.soft(await dropdown.getAttribute("open")).toBe("");

  const statusText = dropdown.locator(".execution-progress-status");
  try {
    await expect(statusText).toHaveText(expectedStatus, { timeout: 10000 });
  } catch {
    expect.soft(await statusText.textContent()).toBe(expectedStatus);
  }

  await takeAndAttachScreenshot(
    page,
    `execution-progress-asserted-${state}`,
    eyes,
  );
}
