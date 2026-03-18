import { Page, TestInfo } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";
import { JioAppInProxyPage } from "../../page-objects/jio-proxy-page";
import { MockServerPage } from "../../page-objects/mock-server-page";
import { SpecmaticStudioPage } from "../../page-objects/specmatic-studio-page";
import { test } from "../../utils/eyesFixture";
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
    "Record New API Specification via Proxy",
    {
      tag: ["@proxy", "@recordNewSpec", "@eyes", "@expected-failure"],
    },
    async ({ page, eyes }, testInfo) => {
      test.fail(true, "YAML Clickable Issue");
      const steps = new RecordInvalidNumberSteps(page, testInfo, eyes);

      await steps.setupProxyRecording();
      const proxyUrl = await steps.assertProxyStartedAndGetUrl();
      const jioPage = await steps.openProxyTargetTab(proxyUrl);

      await steps.captureApiCallAndVerifyInProxyTable(jioPage);
      await steps.startMockReplayAndVerifySidebar();
      await steps.replayViaMockAndVerifyMockTab(proxyUrl);
      await steps.viewDrillDownDetails();
    },
  );

  test(
    "Record New API Specification via Proxy for Valid Prepaid Number",
    {
      tag: [
        "@proxy",
        "@recordValidNumber",
        "@recordNewSpec",
        "@eyes",
        "@expected-failure",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      const steps = new RecordValidNumberSteps(page, testInfo, eyes);

      await steps.setupProxyRecording();
      const proxyUrl = await steps.assertProxyStartedAndGetUrl();
      const jioPage = await steps.openProxyTargetTab(proxyUrl);

      await steps.captureAndVerifyBothEndpoints(jioPage);
      await steps.startMockReplayAndVerifySidebar();
      await steps.replayViaMockAndVerifyMockTab(jioPage, proxyUrl);
      await steps.navigateToExampleGeneration();
      await steps.generateMoreExamplesForBothEndpoints();
      await steps.copyPasteAndReplacePhoneNumberEndpoint();
      await steps.copyPasteAndReplaceForPlansEndpoint();
      await steps.stopAndReplayPlansEndpoint();
      await steps.enterNewNumberAndVerifyPlans(jioPage, proxyUrl);
      await steps.removeAllPopularPlans();
      await steps.stopAndReplayPlansEndpoint();
      await steps.reloadAndVerifyNoPopularPlansForNewNumber(jioPage, proxyUrl);
    },
  );
});

const INVALID_JIO_NUMBER = "8556663339";
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
      return new JioAppInProxyPage(proxyTab, this.testInfo, this.eyes);
    });
  }
}

class RecordInvalidNumberSteps extends ProxyRecordingSteps {
  async captureApiCallAndVerifyInProxyTable(
    jioPage: JioAppInProxyPage,
  ): Promise<void> {
    await test.step(`Capture API call with mobile number '${INVALID_JIO_NUMBER}'`, async () => {
      await this.page.bringToFront();
      await this.studio.assertProxyTableVisible();

      await jioPage.bringToFront();
      await jioPage.enterMobileNumberAndProceed(INVALID_JIO_NUMBER);

      await this.page.bringToFront();
      await this.studio.assertProxyTableRowByPath(JIO_RECHARGE_NUMBER_PATH, 1);
    });
  }

  async startMockReplayAndVerifySidebar(): Promise<void> {
    await test.step("Start mock replay and verify in right sidebar", async () => {
      await this.studio.clickReplayForPath(JIO_RECHARGE_NUMBER_PATH);
      await this.studio.assertRightSidebarMockStarted(PROXY_RECORDINGS_SPEC);
    });
  }

  async replayViaMockAndVerifyMockTab(proxyUrl: string): Promise<void> {
    await test.step("Verify mock replay serves the endpoint", async () => {
      const proxyTab = await this.studio.openProxyUrlInNewTab(proxyUrl);
      const newJioPage = new JioAppInProxyPage(
        proxyTab,
        this.testInfo,
        this.eyes,
      );

      await newJioPage.enterMobileNumberAndProceed(INVALID_JIO_NUMBER);

      await this.page.bringToFront();
      await this.studio.sideBar.ensureSidebarOpen();
      await this.studio.sideBar.selectSpec(PROXY_RECORDINGS_SPEC);
      await this.mockPage.goBackToMockServerTab();
      await this.mockPage.assertMockPathVisible(JIO_RECHARGE_NUMBER_PATH);
    });
  }

  async viewDrillDownDetails(): Promise<void> {
    await test.step("View drill-down details for API result", async () => {
      await this.mockPage.clickMockTableRemark(JIO_RECHARGE_NUMBER_PATH, "400");
      await this.mockPage.getDrillDownState(0);
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

  async startMockReplayAndVerifySidebar(): Promise<void> {
    await test.step("Start mock replay for both endpoints", async () => {
      await this.studio.clickProxyApiFilter();
      await this.studio.clickReplayForPath(JIO_RECHARGE_NUMBER_PATH);
      await this.studio.assertRightSidebarMockStarted(PROXY_RECORDINGS_SPEC);

      await this.studio.clickReplayForPath(JIO_RECHARGE_PLANS_PATH);
      await this.studio.assertRightSidebarMockStarted(PROXY_RECORDINGS_SPEC);
    });
  }

  async replayViaMockAndVerifyMockTab(
    jioPage: JioAppInProxyPage,
    proxyUrl: string,
  ): Promise<void> {
    await test.step("Verify mock replay serves both endpoints", async () => {
      await jioPage.bringToFront();
      await jioPage.goto(proxyUrl);
      await jioPage.enterMobileNumberAndProceed(VALID_JIO_NUMBER);
      await jioPage.assertPlansPageVisible();

      await this.page.bringToFront();
      await this.studio.sideBar.ensureSidebarOpen(true);
      await this.studio.sideBar.selectSpec(PROXY_RECORDINGS_SPEC);
      await this.mockPage.goBackToMockServerTab();

      await this.mockPage.assertMockPathVisible(JIO_RECHARGE_NUMBER_PATH);
      await this.mockPage.assertMockPathVisible(JIO_RECHARGE_PLANS_PATH);
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
    if (process.platform !== "win32" && process.platform !== "linux") {
      await test.step("Skipping stop and replay steps for plans endpoint because File Watcher issue is not there on MacOS", async () => {
        console.log(
          "\tSkipping stop and replay steps for plans endpoint because File Watcher issue is not there on MacOS",
        );
        return;
      });
    }

    await test.step("Stop and replay plans endpoint on record page to avoid File Watcher issue on Windows/Linux", async () => {
      await this.page.bringToFront();

      await this.studio.sideBar.ensureSidebarOpen();
      await this.studio.clickRecordSpec();
      await this.studio.assertProxyTableVisible();

      await this.studio.clickStopReplayForPath(JIO_RECHARGE_PLANS_PATH);
      await this.studio.clickReplayForPath(JIO_RECHARGE_PLANS_PATH);
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
      await this.studio.sideBar.selectSpec(PROXY_RECORDINGS_SPEC);
      await this.mockPage.goBackToMockServerTab();
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
