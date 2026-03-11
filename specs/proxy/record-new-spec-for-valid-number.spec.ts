import { test, expect } from "../../utils/eyesFixture";
import {
  JIO_PAGE_URL,
  PROXY_PORT,
  PROXY_RECORDINGS_SPEC,
  JIO_RECHARGE_NUMBER_PATH,
  JIO_RECHARGE_PLANS_PATH,
  JIO_RECHARGE_NUMBER_RAW_PATH,
  JIO_RECHARGE_PLANS_RAW_PATH,
  VALID_JIO_NUMBER,
  NEW_JIO_NUMBER,
  JIO_RECHARGE_RESPONSE_CODE,
} from "../specNames";
import { SpecmaticStudioPage } from "../../page-objects/specmatic-studio-page";
import { MockServerPage } from "../../page-objects/mock-server-page";
import { JioAppInProxyPage } from "../../page-objects/jio-proxy-page";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";
import { Edit } from "../../utils/types/json-edit.types";
import { Page, TestInfo } from "@playwright/test";

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

class RecordValidNumberSteps {
  private readonly studio: SpecmaticStudioPage;
  private readonly mockPage: MockServerPage;
  private readonly examplePage: ExampleGenerationPage;

  constructor(
    private readonly page: Page,
    private readonly testInfo: TestInfo,
    private readonly eyes: unknown,
  ) {
    this.studio = new SpecmaticStudioPage(page, testInfo, eyes);
    this.mockPage = new MockServerPage(
      page,
      testInfo,
      eyes,
      PROXY_RECORDINGS_SPEC,
    );
    this.examplePage = new ExampleGenerationPage(
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

  async replayViaMockAndVerifyMockTab(proxyUrl: string): Promise<void> {
    await test.step(`Verify mock replay serves both endpoints`, async () => {
      const proxyTab = await this.studio.openProxyUrlInNewTab(proxyUrl);
      const newJioPage = new JioAppInProxyPage(
        proxyTab,
        this.testInfo,
        this.eyes,
      );

      await newJioPage.enterMobileNumberAndProceed(VALID_JIO_NUMBER);
      await newJioPage.assertPlansPageVisible();

      await this.page.bringToFront();
      await this.studio.sideBar.ensureSidebarOpen();
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

  private async copyPasteAndReplaceForEndpoint(
    rawPath: string,
    endpoint: "number" | "plans",
    edits: Edit[],
  ): Promise<void> {
    await test.step(`Edit and save example for ${endpoint} endpoint`, async () => {
      // Copy from first path-method-response combination
      await this.examplePage.clickViewDetails(
        rawPath,
        JIO_RECHARGE_RESPONSE_CODE,
      );
      await this.examplePage.copyEditorContent();
      await this.examplePage.goBackFromExample();

      // Paste into newly generated example (generated with Generate More)
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
    });
  }

  async copyPasteAndReplaceForNumberEndpoint(): Promise<void> {
    await this.copyPasteAndReplaceForEndpoint(
      JIO_RECHARGE_NUMBER_RAW_PATH,
      "number",
      NUMBER_ENDPOINT_EDITS,
    );
  }

  async copyPasteAndReplaceForPlansEndpoint(): Promise<void> {
    await this.copyPasteAndReplaceForEndpoint(
      JIO_RECHARGE_PLANS_RAW_PATH,
      "plans",
      PLANS_ENDPOINT_EDITS,
    );
  }

  async enterNewNumberAndVerifyPlans(proxyUrl: string): Promise<void> {
    await test.step(`Verify mock serves plans for new number '${NEW_JIO_NUMBER}'`, async () => {
      const proxyTab = await this.studio.openProxyUrlInNewTab(proxyUrl);
      const newJioPage = new JioAppInProxyPage(
        proxyTab,
        this.testInfo,
        this.eyes,
      );

      await newJioPage.enterMobileNumberAndProceed(NEW_JIO_NUMBER);
      await newJioPage.assertPlansPageVisible();

      await this.page.bringToFront();
      await this.mockPage.goBackToMockServerTab();
      await this.mockPage.assertMockPathVisible(JIO_RECHARGE_PLANS_PATH);
    });
  }
}

test.describe("API Specification Management", () => {
  test(
    "Record New API Specification via Proxy for Valid Prepaid Number",
    {
      tag: ["@proxy", "@recordValidNumber", "@recordNewSpec", "@eyes"],
    },
    async ({ page, eyes }, testInfo) => {
      const steps = new RecordValidNumberSteps(page, testInfo, eyes);

      // Setup: Record API calls via proxy
      await steps.setupProxyRecording();
      const proxyUrl = await steps.assertProxyStartedAndGetUrl();
      const jioPage = await steps.openProxyTargetTab(proxyUrl);

      // Capture: Record both endpoints
      await steps.captureAndVerifyBothEndpoints(jioPage);

      // Mock Replay: Start mock servers and verify sidebar
      await steps.startMockReplayAndVerifySidebar();
      await steps.replayViaMockAndVerifyMockTab(proxyUrl);

      // Example Generation: Generate and modify examples
      await steps.navigateToExampleGeneration();
      await steps.generateMoreExamplesForBothEndpoints();
      await steps.copyPasteAndReplaceForNumberEndpoint();
      await steps.copyPasteAndReplaceForPlansEndpoint();

      // Verify: Confirm mock serves new number
      await steps.enterNewNumberAndVerifyPlans(proxyUrl);
    },
  );
});
