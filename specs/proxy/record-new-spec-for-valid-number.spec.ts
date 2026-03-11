import { test } from "../../utils/eyesFixture";
import { JIO_PAGE_URL, PROXY_PORT, PROXY_RECORDINGS_SPEC } from "../specNames";
import { SpecmaticStudioPage } from "../../page-objects/specmatic-studio-page";
import { MockServerPage } from "../../page-objects/mock-server-page";
import { JioAppInProxyPage } from "../../page-objects/jio-proxy-page";
import { ExampleGenerationPage } from "../../page-objects/example-generation-page";
import { Edit } from "../../utils/types/json-edit.types";
import { Page, TestInfo } from "@playwright/test";

const NUMBER_PATH =
  "/api/jio-recharge-service/recharge/mobility/number/{param}";
const PLANS_PATH = "/api/jio-recharge-service/recharge/plans/serviceId/{param}";

const NUMBER_RAW_PATH =
  "api/jio-recharge-service/recharge/mobility/number/(param:number)";
const PLANS_RAW_PATH =
  "api/jio-recharge-service/recharge/plans/serviceId/(param:number)";

const VALID_NUMBER = "9321124338";
const NEW_NUMBER = "9000000000";

const NUMBER_ENDPOINT_EDITS: Edit[] = [
  {
    current: {
      mode: "exact",
      value: `"path": "/api/jio-recharge-service/recharge/mobility/number/${VALID_NUMBER}"`,
    },
    changeTo: `  "path": "/api/jio-recharge-service/recharge/mobility/number/${NEW_NUMBER}",`,
  },
  {
    current: { mode: "keyOnly", key: "serviceId" },
    changeTo: `  "serviceId": "${NEW_NUMBER}",`,
  },
];

const PLANS_ENDPOINT_EDITS: Edit[] = [
  {
    current: {
      mode: "exact",
      value: `"path": "/api/jio-recharge-service/recharge/plans/serviceId/${VALID_NUMBER}"`,
    },
    changeTo: `  "path": "/api/jio-recharge-service/recharge/plans/serviceId/${NEW_NUMBER}",`,
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
    await test.step(`Enter valid number '${VALID_NUMBER}' and verify both endpoints in proxy table`, async () => {
      await this.page.bringToFront();
      await this.studio.assertProxyTableVisible();
      await jioPage.bringToFront();
      await jioPage.enterMobileNumberAndProceed(VALID_NUMBER);
      await this.page.bringToFront();
      await this.studio.assertProxyTableRowByPath(NUMBER_PATH, 1);
      await this.studio.assertProxyTableRowByPath(PLANS_PATH, 1);
    });
  }

  async startMockReplayAndVerifySidebar(): Promise<void> {
    await test.step("Start mock replay for both endpoints and verify sidebar", async () => {
      await this.studio.clickProxyApiFilter();
      await this.studio.clickReplayForPath(NUMBER_PATH);
      await this.studio.assertRightSidebarMockStarted(PROXY_RECORDINGS_SPEC);
      await this.studio.clickReplayForPath(PLANS_PATH);
      await this.studio.assertRightSidebarMockStarted(PROXY_RECORDINGS_SPEC);
    });
  }

  async replayViaMockAndVerifyMockTab(proxyUrl: string): Promise<void> {
    await test.step(`Replay via mock: enter '${VALID_NUMBER}' again and verify mock tab`, async () => {
      const proxyTab = await this.studio.openProxyUrlInNewTab(proxyUrl);
      const newJioPage = new JioAppInProxyPage(
        proxyTab,
        this.testInfo,
        this.eyes,
      );
      await newJioPage.enterMobileNumberAndProceed(VALID_NUMBER);
      await newJioPage.assertPlansPageVisible();
      await this.page.bringToFront();
      await this.studio.sideBar.ensureSidebarOpen();
      await this.studio.sideBar.selectSpec(PROXY_RECORDINGS_SPEC);
      await this.mockPage.goBackToMockServerTab();
      await this.mockPage.assertMockPathVisible(NUMBER_PATH);
      await this.mockPage.assertMockPathVisible(PLANS_PATH);
    });
  }

  async navigateToExampleGeneration(): Promise<void> {
    await test.step(`Navigate to '${PROXY_RECORDINGS_SPEC}' and open Example Generation tab`, async () => {
      await this.examplePage.openExampleGenerationTabFromTab();
    });
  }

  async generateMoreExamplesForBothEndpoints(): Promise<void> {
    await test.step("Generate more examples for both endpoints", async () => {
      await this.examplePage.clickGenerateMoreButton(NUMBER_RAW_PATH, 200);
      await this.examplePage.clickGenerateMoreButton(PLANS_RAW_PATH, 200);
    });
  }

  private async copyPasteAndReplaceForEndpoint(
    rawPath: string,
    endpoint: "number" | "plans",
    edits: Edit[],
  ): Promise<void> {
    await test.step(`Copy-paste and replace number for ${endpoint} endpoint`, async () => {
      await this.examplePage.clickViewDetails(rawPath, 200);
      await this.examplePage.copyEditorContent();
      await this.examplePage.goBackFromExample();

      await this.examplePage.clickViewDetails(rawPath, 200, true, true);
      await this.examplePage.pasteIntoEditor();
      await this.examplePage.editExample(edits);
      await this.examplePage.saveEditedExample("Valid Example");
      await this.examplePage.goBackFromExample();
    });
  }

  async copyPasteAndReplaceForNumberEndpoint(): Promise<void> {
    await this.copyPasteAndReplaceForEndpoint(
      NUMBER_RAW_PATH,
      "number",
      NUMBER_ENDPOINT_EDITS,
    );
  }

  async copyPasteAndReplaceForPlansEndpoint(): Promise<void> {
    await this.copyPasteAndReplaceForEndpoint(
      PLANS_RAW_PATH,
      "plans",
      PLANS_ENDPOINT_EDITS,
    );
  }

  async enterNewNumberAndVerifyPlans(proxyUrl: string): Promise<void> {
    await test.step(`Enter new number '${NEW_NUMBER}' via Jio app and verify plans are served by mock`, async () => {
      const proxyTab = await this.studio.openProxyUrlInNewTab(proxyUrl);
      const newJioPage = new JioAppInProxyPage(
        proxyTab,
        this.testInfo,
        this.eyes,
      );
      await newJioPage.enterMobileNumberAndProceed(NEW_NUMBER);
      await newJioPage.assertPlansPageVisible();
      await this.page.bringToFront();
      await this.mockPage.goBackToMockServerTab();
      await this.mockPage.assertMockPathVisible(PLANS_PATH);
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

      await steps.setupProxyRecording();
      const proxyUrl = await steps.assertProxyStartedAndGetUrl();
      const jioPage = await steps.openProxyTargetTab(proxyUrl);

      await steps.captureAndVerifyBothEndpoints(jioPage);
      await steps.startMockReplayAndVerifySidebar();
      await steps.replayViaMockAndVerifyMockTab(proxyUrl);

      await steps.navigateToExampleGeneration();
      await steps.generateMoreExamplesForBothEndpoints();

      await steps.copyPasteAndReplaceForNumberEndpoint();
      await steps.copyPasteAndReplaceForPlansEndpoint();

      await steps.enterNewNumberAndVerifyPlans(proxyUrl);
    },
  );
});
