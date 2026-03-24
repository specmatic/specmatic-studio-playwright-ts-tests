import { test, expect } from "../../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../../utils/screenshotUtils";
import { SPECMATIC_CONFIG } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { Page, TestInfo } from "playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  buildV2CompletedLogLines,
  runMockBackedConfigFlow,
  V2_MOCK_BACKED_RUNNING_LOG_LINES,
} from "./run-suite-mock-flow-helper";

test.describe("Specmatic Config V2", () => {
  let originalSpecmaticYaml: string;

  test.beforeEach(() => {
    originalSpecmaticYaml = fs.readFileSync(SPECMATIC_CONFIG_PATH, "utf-8");
    seedV2Config();
  });

  test.afterEach(() => {
    fs.writeFileSync(SPECMATIC_CONFIG_PATH, originalSpecmaticYaml, "utf-8");
  });

  test(
    "Run Suite using v2 config and then with the dynamically started mock",
    {
      tag: ["@config", "@runSuiteForV2", "@eyes", "@expected-failure"],
    },
    async ({ page, eyes }, testInfo) => {
      test.fail(
        true,
        "Known issue: v2 config shows an unexpected 'Specification not found' dialog while Run Suite.",
      );

      const configPage = createConfigPage(page, eyes, testInfo);
      await installUnexpectedStubFailureDialogWatcher(page);
      const dialogState = await runBaseV2Suite(configPage, page, eyes);
      await runMockBackedV2Suite({
        page,
        eyes,
        testInfo,
      });
      await assertUnexpectedStubFailureDialogNeverAppeared(dialogState);
    },
  );
});

const CONFIG_NAME = SPECMATIC_CONFIG;
const SPECS_DIR = path.join(process.cwd(), "specmatic-studio-demo", "specs");
const SPECMATIC_CONFIG_PATH = path.join(SPECS_DIR, CONFIG_NAME);
const V2_RESOURCE_PATH = path.join(
  SPECS_DIR,
  "test-specmatic-config",
  "specmatic-run-suite-v2.yaml",
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

function seedV2Config() {
  fs.writeFileSync(
    SPECMATIC_CONFIG_PATH,
    fs.readFileSync(V2_RESOURCE_PATH, "utf-8"),
    "utf-8",
  );
}

function createConfigPage(page: Page, eyes: any, testInfo: TestInfo) {
  return new ServiceSpecConfigPage(page, testInfo, eyes, CONFIG_NAME);
}

async function runBaseV2Suite(
  configPage: ServiceSpecConfigPage,
  page: Page,
  eyes: any,
) {
  return await test.step("Run Suite against the configured backend", async () => {
    await openSpecmaticConfig(configPage);
    await runSuite(configPage);
    await expectExecutionState(
      configPage,
      page,
      eyes,
      "running",
      "Running",
      RUNNING_LOG_LINES,
      "run-suite-v2-running",
    );
    await configPage.waitForExecutionToComplete();
    await expectExecutionState(
      configPage,
      page,
      eyes,
      "error",
      "Failed",
      FAILED_LOG_LINES,
      "run-suite-v2-failed",
    );

    return await finalizeUnexpectedStubFailureDialogWatch(page, configPage, eyes);
  });
}

async function runMockBackedV2Suite({
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
      seedConfig: seedV2Config,
      originalBaseUrlReference: "- baseUrl: http://order-bff:8080",
      originalSpecReference: "- product_search_bff_v5.yaml",
      updatedSpecReference:
        "- test-specmatic-config/product_search_bff_v5_config_mock.yaml",
      runningLogLines: V2_MOCK_BACKED_RUNNING_LOG_LINES,
      buildCompletedLogLines: buildV2CompletedLogLines,
      runningScreenshotName: "run-suite-v2-with-mock-running",
      completedScreenshotName: "run-suite-v2-with-mock-completed",
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

async function installUnexpectedStubFailureDialogWatcher(page: Page) {
  await test.step("Watch for unexpected stub-server dialog", async () => {
    await page.evaluate(() => {
      const watchKey = "__specmaticUnexpectedStubDialogWatch";

      const readMatchingDialog = () => {
        const dialogs = Array.from(
          document.querySelectorAll(".alert-msg.error"),
        );

        for (const dialog of dialogs) {
          const title = dialog.querySelector("p")?.textContent?.trim() ?? "";
          const description =
            dialog.querySelector("pre")?.textContent?.trim() ?? "";

          if (
            title === "Failed to start the stub server" &&
            description.includes("Specification not found")
          ) {
            return { seen: true, title, description };
          }
        }

        return { seen: false, title: "", description: "" };
      };

      const existingWatch = (window as any)[watchKey];
      if (existingWatch?.observer) {
        existingWatch.observer.disconnect();
      }

      const initialState = readMatchingDialog();
      const state = {
        seen: initialState.seen,
        title: initialState.title,
        description: initialState.description,
      };

      const observer = new MutationObserver(() => {
        if (state.seen) {
          return;
        }

        const currentState = readMatchingDialog();
        if (currentState.seen) {
          state.seen = true;
          state.title = currentState.title;
          state.description = currentState.description;
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      (window as any)[watchKey] = { state, observer };
    });
  });
}

async function finalizeUnexpectedStubFailureDialogWatch(
  page: Page,
  configPage: ServiceSpecConfigPage,
  eyes: any,
) {
  return await test.step("Capture unexpected stub-server dialog state for the base run", async () => {
    const dialogState = await page.evaluate(() => {
      const watch = (window as any).__specmaticUnexpectedStubDialogWatch;
      if (!watch) {
        return null;
      }

      watch.observer?.disconnect();
      return watch.state;
    });

      const visibleUnexpectedDialog = await configPage.alertContainer
        .isVisible()
        .catch(() => false);

      if (visibleUnexpectedDialog) {
        await takeAndAttachScreenshot(
          page,
          "run-suite-v2-unexpected-dialog",
          eyes,
        );
        await configPage.dismissAlert();
      }

    return dialogState;
  });
}

async function assertUnexpectedStubFailureDialogNeverAppeared(
  dialogState: { seen: boolean; title: string; description: string } | null,
) {
  await test.step("Assert unexpected stub-server dialog never appeared", async () => {
    if (dialogState?.seen) {
      throw new Error(
        `Unexpected stub-server dialog appeared during the base run: ${dialogState.title} :: ${dialogState.description}`,
      );
    }
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
