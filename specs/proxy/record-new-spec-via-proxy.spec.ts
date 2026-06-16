import { Page, TestInfo } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";
import { JioAppInProxyPage } from "../../page-objects/jio-proxy-page";
import { MockServerPage } from "../../page-objects/mock-server-page";
import { SpecmaticStudioPage } from "../../page-objects/specmatic-studio-page";
import { test } from "../../utils/eyesFixture";
import { shouldUseFileWatcherWorkaround } from "../../utils/fileWatcherWorkaround";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { Edit } from "../../utils/types/json-edit.types";
import {
  JIO_PAGE_URL,
  JIO_RECHARGE_NUMBER_PATH,
  JIO_RECHARGE_NUMBER_RAW_PATH,
  JIO_RECHARGE_PLANS_PATH,
  JIO_RECHARGE_PLANS_RAW_PATH,
  JIO_RECHARGE_RESPONSE_CODE,
  NEW_JIO_NUMBER,
  PROXY_PORT,
  PROXY_RECORDINGS_SPEC,
  VALID_JIO_NUMBER,
} from "../specNames";

test.describe("API Specification Management", () => {
  test(
    "Record New API Specification via Proxy for Valid and Invalid Numbers",
    {
      tag: ["@proxy", "@recordNewSpec", "@eyes"],
    },
    async ({ page, eyes }, testInfo) => {
      test.setTimeout(300000);
      const validSteps = new RecordValidNumberSteps(page, testInfo, eyes);

      await validSteps.setupProxyRecording();
      let proxyUrl = await validSteps.assertProxyStartedAndGetUrl();
      const jioPage = await validSteps.openProxyTargetTab(proxyUrl);

      await validSteps.captureAndVerifyBothEndpoints(jioPage);
      await validSteps.startMockReplayAndVerifySidebar(true);
      await validSteps.replayViaMockAndVerifyMockTab(jioPage, proxyUrl, true);
      await validSteps.navigateToExampleGeneration();
      await validSteps.generateMoreExamplesForBothEndpoints();
      await validSteps.copyPasteAndReplacePhoneNumberEndpoint();
      await validSteps.copyPasteAndReplaceForPlansEndpoint();
      await validSteps.stopAndReplayPlansEndpoint();
      await validSteps.enterNewNumberAndVerifyPlans(jioPage, proxyUrl);
      await validSteps.removeAllPopularPlans();
      await validSteps.stopAndReplayPlansEndpoint();
      await validSteps.reloadAndVerifyNoPopularPlansForNewNumber(
        jioPage,
        proxyUrl,
      );

      await jioPage.close();
    },
  );
});

const PROXY_RECORDINGS_EXAMPLES_DIR = path.join(
  process.cwd(),
  "specmatic-studio-demo",
  "specs",
);

const NUMBER_ENDPOINT_EDITS: Edit[] = [
  {
    current: {
      mode: "exact",
      value: `"path": "/api/jio-recharge-service/recharge/mobility/number/${VALID_JIO_NUMBER}"`,
    },
    changeTo: `  "path": "/api/jio-recharge-service/recharge/mobility/number/${NEW_JIO_NUMBER}",`,
  },
  {
    current: { mode: "keyOnly", key: "serviceId" },
    changeTo: `  "serviceId": "${NEW_JIO_NUMBER}",`,
  },
];

const PLANS_ENDPOINT_EDITS: Edit[] = [
  {
    current: {
      mode: "exact",
      value: `"path": "/api/jio-recharge-service/recharge/plans/serviceId/${VALID_JIO_NUMBER}"`,
    },
    changeTo: `  "path": "/api/jio-recharge-service/recharge/plans/serviceId/${NEW_JIO_NUMBER}",`,
  },
];

const REMOVE_ALL_POPULAR_PLANS_PATH = [
  "http-response",
  "body",
  "planCategories",
  0,
  "subCategories",
  0,
  "plans",
] as const;

class ProxyRecordingSteps {
  protected readonly studio: SpecmaticStudioPage;
  protected readonly mockPage: MockServerPage;

  constructor(
    protected readonly page: Page,
    protected readonly testInfo: TestInfo,
    protected readonly eyes: unknown,
  ) {
    this.studio = new SpecmaticStudioPage(page, testInfo, eyes);
    this.mockPage = new MockServerPage(
      page,
      testInfo,
      eyes,
      PROXY_RECORDINGS_SPEC,
    );
  }

  async setupProxyRecording(): Promise<void> {
    await test.step("Setup proxy recording", async () => {
      await this.studio.gotoHomeAndOpenSidebar();
      await this.studio.clickRecordSpec();
      await this.studio.fillTargetUrl(JIO_PAGE_URL);
      await this.studio.fillProxyPort(PROXY_PORT);
      await this.studio.acceptProxyErrorDialog();
      await this.studio.clickStartProxy();
    });
  }

  async assertProxyStartedAndGetUrl(): Promise<string> {
    return test.step("Assert proxy started and get URL", () =>
      this.studio.assertProxyStartedAndGetUrl("Proxy Started"));
  }

  async openProxyTargetTab(proxyUrl: string): Promise<JioAppInProxyPage> {
    return test.step("Open proxy target in new tab", async () => {
      const proxyTab = await this.studio.openProxyUrlInNewTab(proxyUrl);
      return new JioAppInProxyPage(proxyTab, this.testInfo);
    });
  }
}

class RecordValidNumberSteps extends ProxyRecordingSteps {
  private readonly examplePage: ExampleGenerationPage;

  constructor(page: Page, testInfo: TestInfo, eyes: unknown) {
    super(page, testInfo, eyes);
    this.examplePage = new ExampleGenerationPage(
      page,
      testInfo,
      eyes,
      PROXY_RECORDINGS_SPEC,
    );
  }

  async captureAndVerifyBothEndpoints(
    jioPage: JioAppInProxyPage,
  ): Promise<void> {
    await test.step(`Capture both endpoints with valid number '${VALID_JIO_NUMBER}'`, async () => {
      await this.page.bringToFront();
      await this.studio.assertProxyTableVisible();

      await jioPage.bringToFront();
      await jioPage.enterMobileNumberAndProceed(VALID_JIO_NUMBER);

      await this.page.bringToFront();
      await this.studio.assertProxyTableRowByPath(JIO_RECHARGE_NUMBER_PATH, 1);
      await this.studio.assertProxyTableRowByPath(JIO_RECHARGE_PLANS_PATH, 1);
    });
  }

  async startMockReplayAndVerifySidebar(
    withVisualValidation = false,
  ): Promise<void> {
    await test.step("Start mock replay for both endpoints", async () => {
      await this.studio.clickProxyApiFilter();
      await this.studio.clickReplayForPath(JIO_RECHARGE_NUMBER_PATH, false);
      await this.studio.clickReplayForPath(
        JIO_RECHARGE_PLANS_PATH,
        withVisualValidation,
      );
      await this.studio.assertRightSidebarMockStarted(
        PROXY_RECORDINGS_SPEC,
        withVisualValidation,
      );
    });
  }

  async replayViaMockAndVerifyMockTab(
    jioPage: JioAppInProxyPage,
    proxyUrl: string,
    withVisualValidation = false,
  ): Promise<void> {
    await test.step("Verify mock replay serves both endpoints", async () => {
      await jioPage.bringToFront();
      await jioPage.goto(proxyUrl);
      await jioPage.enterMobileNumberAndProceed(VALID_JIO_NUMBER);
      await jioPage.assertPlansPageVisible();

      await this.page.bringToFront();
      await this.studio.sideBar.ensureSidebarOpen(withVisualValidation);
      await this.mockPage.openMockTabViaSidebar(
        PROXY_RECORDINGS_SPEC,
        withVisualValidation,
      );
      await this.mockPage.assertMockPathVisible(
        JIO_RECHARGE_NUMBER_PATH,
        false,
      );
      await this.mockPage.assertMockPathVisible(JIO_RECHARGE_PLANS_PATH, false);
      await takeAndAttachScreenshot(
        this.page,
        "replay-mock-verified",
        this.eyes,
      );
    });
  }

  async navigateToExampleGeneration(): Promise<void> {
    await test.step(`Open Example Generation tab for ${PROXY_RECORDINGS_SPEC}`, async () => {
      await this.examplePage.openExampleGenerationTabFromTab();
    });
  }

  async generateMoreExamplesForBothEndpoints(): Promise<void> {
    await test.step("Generate more examples for both endpoints", async () => {
      await this.examplePage.clickGenerateMoreButton(
        JIO_RECHARGE_NUMBER_RAW_PATH,
        JIO_RECHARGE_RESPONSE_CODE,
      );
      await this.examplePage.clickGenerateMoreButton(
        JIO_RECHARGE_PLANS_RAW_PATH,
        JIO_RECHARGE_RESPONSE_CODE,
      );
    });
  }

  private async copyPasteAndReplacePhoneEndpoint(
    rawPath: string,
    endpoint: "number" | "plans",
    edits: Edit[],
  ): Promise<void> {
    await test.step(`Edit and save example for ${endpoint} endpoint`, async () => {
      await this.examplePage.clickViewDetails(
        rawPath,
        JIO_RECHARGE_RESPONSE_CODE,
      );
      await this.examplePage.copyEditorContent();
      await this.examplePage.goBackFromExample();

      await this.examplePage.clickViewDetails(
        rawPath,
        JIO_RECHARGE_RESPONSE_CODE,
        true,
        true,
      );
      await this.examplePage.pasteIntoEditor();
      await this.examplePage.editExample(edits);
      await this.examplePage.saveEditedExample("Valid Example");
      await this.examplePage.goBackFromExample();
      await takeAndAttachScreenshot(
        this.page,
        `edited-and-saved-${endpoint}-endpoint-example`,
        this.eyes,
      );
    });
  }

  async copyPasteAndReplacePhoneNumberEndpoint(): Promise<void> {
    await this.copyPasteAndReplacePhoneEndpoint(
      JIO_RECHARGE_NUMBER_RAW_PATH,
      "number",
      NUMBER_ENDPOINT_EDITS,
    );
  }

  async copyPasteAndReplaceForPlansEndpoint(): Promise<void> {
    await this.copyPasteAndReplacePhoneEndpoint(
      JIO_RECHARGE_PLANS_RAW_PATH,
      "plans",
      PLANS_ENDPOINT_EDITS,
    );
  }

  async stopAndReplayPlansEndpoint(): Promise<void> {
    if (!shouldUseFileWatcherWorkaround()) {
      await test.step("Skipping stop and replay steps for plans endpoint because file watcher workaround flag is disabled", async () => {
        console.log(
          "\tSkipping stop and replay steps for plans endpoint because ENABLE_FILE_WATCHER_WORKAROUND=false",
        );
        return;
      });
      return;
    }

    await test.step("Stop and replay plans endpoint on record page because file watcher workaround flag is enabled", async () => {
      await this.page.bringToFront();

      await this.studio.sideBar.ensureSidebarOpen();
      await this.studio.clickRecordSpec();
      await this.studio.assertProxyTableVisible();

      await this.studio.clickStopReplayForPath(JIO_RECHARGE_PLANS_PATH);
      await this.studio.clickReplayForPath(JIO_RECHARGE_PLANS_PATH, false);
    });
  }

  async restartProxyRecordingForInvalidFlow(): Promise<void> {
    await test.step("Restart proxy recording before invalid number flow", async () => {
      await this.page.bringToFront();
      await this.studio.stopProxyIfRunning();
      await this.studio.acceptProxyErrorDialog();
      await this.studio.clickStartProxy();
    });
  }

  private updateJsonPathValue(
    jsonContent: string,
    jsonPath: readonly (string | number)[],
    value: unknown,
  ): string {
    const parsedContent = JSON.parse(jsonContent) as Record<string, unknown>;

    let currentNode: unknown = parsedContent;
    for (let index = 0; index < jsonPath.length - 1; index++) {
      const segment = jsonPath[index];

      if (
        currentNode === null ||
        currentNode === undefined ||
        typeof currentNode !== "object" ||
        !(segment in currentNode)
      ) {
        throw new Error(`Could not resolve JSON path segment '${segment}'`);
      }

      currentNode = (currentNode as Record<string | number, unknown>)[segment];
    }

    const lastSegment = jsonPath[jsonPath.length - 1];
    if (
      currentNode === null ||
      currentNode === undefined ||
      typeof currentNode !== "object"
    ) {
      throw new Error(
        `Could not resolve final JSON path segment '${lastSegment}'`,
      );
    }

    (currentNode as Record<string | number, unknown>)[lastSegment] = value;
    return JSON.stringify(parsedContent, null, 4);
  }

  async enterNewNumberAndVerifyPlans(
    jioPage: JioAppInProxyPage,
    proxyUrl: string,
  ): Promise<void> {
    await test.step(`Verify mock serves plans for new number '${NEW_JIO_NUMBER}'`, async () => {
      await jioPage.bringToFront();
      await jioPage.goto(proxyUrl);
      await jioPage.enterMobileNumberAndProceed(NEW_JIO_NUMBER);
      await jioPage.assertPlansPageVisible();

      await this.page.bringToFront();
      await this.studio.sideBar.ensureSidebarOpen();
      await this.mockPage.openMockTabViaSidebar(PROXY_RECORDINGS_SPEC);
      await this.mockPage.assertMockPathVisible(JIO_RECHARGE_PLANS_PATH);
    });
  }

  async removeAllPopularPlans(): Promise<void> {
    await test.step("Remove all popular plans from the generated plans example", async () => {
      await this.examplePage.openExampleGenerationTabFromTab();
      await this.examplePage.clickViewDetails(
        JIO_RECHARGE_PLANS_RAW_PATH,
        JIO_RECHARGE_RESPONSE_CODE,
        true,
        true,
      );

      const relativeExamplePath =
        await this.examplePage.getCurrentExampleRelativeFilePath();
      const currentExample = await fs.readFile(
        path.join(
          PROXY_RECORDINGS_EXAMPLES_DIR,
          relativeExamplePath.replace(/^\.\//, ""),
        ),
        "utf-8",
      );
      const updatedExample = this.updateJsonPathValue(
        currentExample,
        REMOVE_ALL_POPULAR_PLANS_PATH,
        [],
      );

      await this.examplePage.replaceEditorContent(updatedExample);
      await this.examplePage.saveEditedExample("Valid Example");
      await this.examplePage.goBackFromExample();
    });
  }

  async reloadAndVerifyNoPopularPlansForNewNumber(
    jioPage: JioAppInProxyPage,
    proxyUrl: string,
  ): Promise<void> {
    await test.step(`Reload Jio page and verify no plans message for '${NEW_JIO_NUMBER}'`, async () => {
      await jioPage.bringToFront();
      await jioPage.goto(proxyUrl);
      await jioPage.enterMobileNumberAndProceedExpectingNoPlans(NEW_JIO_NUMBER);
      await jioPage.assertNoPlansMessageVisible();
    });
  }
}
