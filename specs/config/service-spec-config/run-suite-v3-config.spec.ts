import { test, expect } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { SPECMATIC_CONFIG } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { Page, TestInfo } from "playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  MOCK_BACKED_RUNNING_LOG_LINES,
  runMockBackedConfigFlow,
} from "./run-suite-mock-flow-helper";

test.describe("Specmatic Config V3", () => {
  let originalSpecmaticYaml: string;

  test.beforeEach(() => {
    originalSpecmaticYaml = fs.readFileSync(SPECMATIC_CONFIG_PATH, "utf-8");
    seedV3Config();
  });

  test.afterEach(() => {
    fs.writeFileSync(SPECMATIC_CONFIG_PATH, originalSpecmaticYaml, "utf-8");
  });

  test(
    "Run Suite using v3 config and then with the dynamically started mock",
    { tag: ["@config", "@runSuiteForV3", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = createConfigPage(page, eyes, testInfo);

      await runBaseV3Suite(configPage, page, eyes);
      await runMockBackedV3Suite({
        page,
        eyes,
        testInfo,
      });
    },
  );
});

const CONFIG_NAME = SPECMATIC_CONFIG;
const SPECS_DIR = path.join(process.cwd(), "specmatic-studio-demo", "specs");
const SPECMATIC_CONFIG_PATH = path.join(SPECS_DIR, CONFIG_NAME);
const V3_RESOURCE_PATH = path.join(
  SPECS_DIR,
  "test-specmatic-config",
  "specmatic-run-suite-v3.yaml",
);
const RUNNING_LOG_LINES = [
  "[CONFIG] Loaded specmatic.yaml",
  "[MOCK] Starting mock: kafka.yaml",
];
const FAILED_LOG_LINES = [
  "[TEST] Starting contract tests: product_search_bff_v5.yaml",
  "[ERROR][TEST] Contract tests failed: product_search_bff_v5.yaml",
  "Execution failed:",
];
const MOCK_BACKED_FAILED_LOG_LINES = (mockUrl: string) => [
  "[CONFIG] Loaded specmatic.yaml (tests=1, mocks=1)",
  "[MOCK] Starting mock: kafka.yaml (port=9092)",
  "[MOCK] Started mock: kafka.yaml",
  "[READY] Waiting for readiness: kafka.yaml",
  "[READY] Mock ready: kafka.yaml",
  "[TEST] Running configured tests",
  `[TEST] Starting contract tests: test-specmatic-config/product_search_bff_v5_config_mock.yaml (baseUrl=${mockUrl})`,
  "[ERROR][TEST] Contract tests failed: test-specmatic-config/product_search_bff_v5_config_mock.yaml",
  "Execution failed:",
];

function seedV3Config() {
  fs.writeFileSync(
    SPECMATIC_CONFIG_PATH,
    fs.readFileSync(V3_RESOURCE_PATH, "utf-8"),
    "utf-8",
  );
}

function createConfigPage(page: Page, eyes: any, testInfo: TestInfo) {
  return new ServiceSpecConfigPage(page, testInfo, eyes, CONFIG_NAME);
}

async function runBaseV3Suite(
  configPage: ServiceSpecConfigPage,
  page: Page,
  eyes: any,
) {
  await test.step("Run Suite against the configured backend", async () => {
    await openSpecmaticConfig(configPage);
    await runSuite(configPage);
    await expectExecutionState(
      configPage,
      page,
      eyes,
      "running",
      "Running",
      RUNNING_LOG_LINES,
      "run-suite-v3-running",
    );
    await configPage.waitForExecutionToComplete();
    await expectExecutionState(
      configPage,
      page,
      eyes,
      "error",
      "Failed",
      FAILED_LOG_LINES,
      "run-suite-v3-failed",
    );
  });
}

async function runMockBackedV3Suite({
  page,
  eyes,
  testInfo,
}: {
  page: Page;
  eyes: any;
  testInfo: TestInfo;
}) {
  await test.step("Run Suite against the dynamically started mock", async () => {
    await runMockBackedConfigFlow({
      page,
      eyes,
      testInfo,
      seedConfig: seedV3Config,
      originalBaseUrlReference: "baseUrl: http://order-bff:8080",
      originalSpecReference: "path: product_search_bff_v5.yaml",
      updatedSpecReference:
        "path: test-specmatic-config/product_search_bff_v5_config_mock.yaml",
      runningLogLines: MOCK_BACKED_RUNNING_LOG_LINES,
      buildCompletedLogLines: MOCK_BACKED_FAILED_LOG_LINES,
      runningScreenshotName: "run-suite-v3-with-mock-running",
      completedScreenshotName: "run-suite-v3-with-mock-failed",
      terminalState: "error",
      terminalStatus: "Failed",
    });
  });
}

async function openSpecmaticConfig(configPage: ServiceSpecConfigPage) {
  await test.step(`Open '${CONFIG_NAME}'`, async () => {
    await configPage.gotoHomeAndOpenSidebar();
    await configPage.sideBar.selectSpec(CONFIG_NAME);
    await configPage.openSpecTab();
  });
}

async function runSuite(configPage: ServiceSpecConfigPage) {
  await test.step("Run Suite", async () => {
    await configPage.clickRunSuite();
    await configPage.rightSidebar.close();
  });
}

async function expectExecutionState(
  configPage: ServiceSpecConfigPage,
  page: Page,
  eyes: any,
  state: "error" | "completed" | "running",
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
  const logText = await configPage.executionLog.innerText().catch(() => "");
  for (const line of expectedLogLines) {
    expect
      .soft(logText.includes(line), `Execution log should contain: ${line}`)
      .toBe(true);
  }
}

async function assertExecutionDropDown(
  configPage: ServiceSpecConfigPage,
  page: Page,
  eyes: any,
  state: "error" | "completed" | "running",
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
