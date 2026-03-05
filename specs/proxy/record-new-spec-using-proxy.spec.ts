import { test } from "../../utils/eyesFixture";
import { JIO_PAGE_URL, PROXY_PORT, PROXY_RECORDINGS_SPEC } from "../specNames";
import { SpecmaticStudioPage } from "../../page-objects/specmatic-studio-page";
import { MockServerPage } from "../../page-objects/mock-server-page";
import { JioAppInProxyPage } from "../../page-objects/jio-proxy-page";
import { Page, TestInfo } from "@playwright/test";

const CAPTURED_PATH =
  "/api/jio-recharge-service/recharge/mobility/number/{param}";
const MOBILE_NUMBER = "8556663339";

class RecordNewSpecSteps {
  private readonly studio: SpecmaticStudioPage;
  private readonly mockPage: MockServerPage;

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
      this.studio.assertProxyStartedAndGetUrl('Proxy Started'));
  }

  async openProxyTargetTab(proxyUrl: string): Promise<JioAppInProxyPage> {
    return test.step("Open proxy target in new tab", async () => {
      const proxyTab = await this.studio.openProxyUrlInNewTab(proxyUrl);
      return new JioAppInProxyPage(proxyTab, this.testInfo, this.eyes);
    });
  }

  async captureApiCallAndVerifyInProxyTable(jioPage: JioAppInProxyPage): Promise<void> {
    await test.step(
      `Capture API call: enter mobile '${MOBILE_NUMBER}' and verify in proxy table`,
      async () => {
        await this.page.bringToFront();
        await this.studio.assertProxyTableVisible();
        await jioPage.bringToFront();
        await jioPage.enterMobileNumberAndProceed(MOBILE_NUMBER);
        await this.page.bringToFront();
        await this.studio.assertProxyTableRowByPath(CAPTURED_PATH, 1);
      },
    );
  }

  async startMockReplayAndVerifySidebar(): Promise<void> {
    await test.step("Start mock replay and verify in right sidebar", async () => {
      await this.studio.clickReplayForPath(CAPTURED_PATH);
      await this.studio.assertRightSidebarMockStarted(PROXY_RECORDINGS_SPEC);
    });
  }


  async replayViaMockAndVerifyMockTab(jioPage: JioAppInProxyPage): Promise<void> {
    await test.step(`Replay via mock: second API call and verify in mock tab`, async () => {
      await jioPage.bringToFront();
      await jioPage.enterMobileNumberAndProceed(MOBILE_NUMBER);
      await this.page.bringToFront();
      await this.studio.gotoHomeAndOpenSidebar();
      await this.studio.sideBar.selectSpec(PROXY_RECORDINGS_SPEC);
      await this.mockPage.goBackToMockServerTab();
      await this.mockPage.assertMockPathVisible(CAPTURED_PATH);
    });
  }

  async viewDrillDownDetails(): Promise<void> {
    await test.step("View drill-down details for intercepted API result", async () => {
      await this.mockPage.clickMockTableRemark(CAPTURED_PATH, "400");
      await this.mockPage.getDrillDownState(0);
    });
  }
}

test.describe("API Specification Management", () => {
  test(
    "Record New API Specification via Proxy",
    {
      tag: [
        "@proxy",
        "@recordNewAPISpec",
        "@recordNewSpec",
        "@eyes",
        "@expected-failure",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      test.fail(true, "Needs fixing for the spec");
      const steps = new RecordNewSpecSteps(page, testInfo, eyes);

      await steps.setupProxyRecording();
      const proxyUrl = await steps.assertProxyStartedAndGetUrl();
      const jioPage = await steps.openProxyTargetTab(proxyUrl);
      await steps.captureApiCallAndVerifyInProxyTable(jioPage);
      await steps.startMockReplayAndVerifySidebar();  
      await steps.replayViaMockAndVerifyMockTab(jioPage);
      await steps.viewDrillDownDetails();
    },
  );
});
