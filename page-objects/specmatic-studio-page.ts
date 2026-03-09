import { Locator, expect, type TestInfo, Page, test } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";
import { SideBarPage } from "./side-bar-page";

export class SpecmaticStudioPage extends BasePage {
  readonly leftSidebar: Locator;
  readonly sidebarToggleBtn: Locator;
  readonly sideBar: SideBarPage;
  readonly specTree: Locator;
  private readonly recordSpecBtn: Locator;
  private readonly startProxyBtn: Locator;
  private readonly stopProxyBtn: Locator;
  private readonly proxyStartedAlert: Locator;
  private readonly proxyInfoBox: Locator;
  private readonly proxyTable: Locator;

  private readonly proxyTableRowByPath: (path: string) => Locator;
  private readonly replayBtnByPath: (path: string) => Locator;
  private readonly replayProcessBar: (specName: string) => Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    super(page, testInfo || ({} as TestInfo), eyes);
    this.leftSidebar = page.locator("#left-sidebar");
    this.sidebarToggleBtn = page.locator("button#left-sidebar-toggle");
    this.specTree = page.locator("#spec-tree");
    this.sideBar = new SideBarPage(page, testInfo, eyes);

    this.recordSpecBtn = page.getByRole("button", {
      name: /Record a specification/i,
    });
    this.startProxyBtn = page.locator("#startProxy");
    this.stopProxyBtn = page.locator("#stopProxy");
    this.proxyStartedAlert = page.locator(
      "#alert-container .alert-msg.success",
    );
    this.proxyInfoBox = page.locator("#proxy .info-message-box");
    this.proxyTable = page.locator("table#proxyTable");

    this.proxyTableRowByPath = (path) =>
      page.locator(
        `table#proxyTable tbody td[data-key="path"][data-value="${path}"]`,
      );
    this.replayBtnByPath = (path) =>
      page
        .locator(`table#proxyTable tbody tr[data-key="${path}-GET"]`)
        .locator("button.proxy-btn[data-value='mock']");
    this.replayProcessBar = (specName) =>
      page.locator(
        `#accordion-group-REPLAY .process-bar[data-spec-path*="${specName}"]`,
      );
  }

  async clickRecordSpec() {
    await this.recordSpecBtn.click({ force: true });
    await this.sideBar.closeSidebar();
    await takeAndAttachScreenshot(this.page, "clicked-record-spec", this.eyes);
  }

  async fillTargetUrl(url: string) {
    await this.fillInputByPlaceholder("e.g. https://example.com:3000", url);
    await takeAndAttachScreenshot(this.page, "filled-target-url");
  }

  async fillProxyPort(port: string) {
    await this.fillInputByRole("spinbutton", port);
    await takeAndAttachScreenshot(this.page, "filled-proxy-port");
  }

  async clickStartProxy() {
    await this.startProxyBtn.click({ force: true });
    await this.sideBar.closeSidebar();
    await takeAndAttachScreenshot(this.page, "clicked-start-proxy", this.eyes);
  }

  async clickStopProxy() {
    await takeAndAttachScreenshot(
      this.page,
      "before-clicked-stop-proxy",
      this.eyes,
    );
    await this.stopProxyBtn.click({ force: true });
    await takeAndAttachScreenshot(this.page, "clicked-stop-proxy", this.eyes);
  }

  async assertProxyStartedAlert(expectedText: string) {
    await expect(this.proxyStartedAlert).toBeVisible({ timeout: 10000 });
    await expect(this.proxyStartedAlert.locator("p")).toHaveText(expectedText);
    await takeAndAttachScreenshot(this.page, "proxy-started-alert", this.eyes);
    await this.proxyStartedAlert.locator("button").click();
    await expect(this.proxyStartedAlert).toBeHidden({ timeout: 5000 });
  }

  async getProxyUrl(): Promise<string> {
    await expect(this.proxyInfoBox).toBeVisible({ timeout: 10000 });
    const text = await this.proxyInfoBox.innerText();
    const rawUrl = text.trim().split(/\s+/).pop()!;
    return rawUrl.replace("0.0.0.0", "localhost");
  }

  async assertProxyTableVisible() {
    await expect(this.proxyTable).toBeVisible({ timeout: 15000 });
    await takeAndAttachScreenshot(this.page, "proxy-table-visible", this.eyes);
  }

  async assertProxyTableRowByPath(path: string, expectedCount: number) {
    const row = this.proxyTableRowByPath(path);
    await expect(row).toBeVisible({ timeout: 10000 });
    const countCell = row
      .locator("..")
      .locator(`td[data-key="count"][data-value="${expectedCount}"]`);
    await expect(countCell).toBeVisible({ timeout: 5000 });
    await takeAndAttachScreenshot(
      this.page,
      `proxy-row-${path.replace(/\//g, "-")}`,
      this.eyes,
    );
  }

  async clickReplayForPath(path: string) {
    const replayBtn = this.replayBtnByPath(path);
    await expect(replayBtn).toBeVisible({ timeout: 5000 });
    await replayBtn.click();
    await takeAndAttachScreenshot(this.page, "replay-clicked", this.eyes);
  }

  async assertRightSidebarMockStarted(specName: string) {
    await this.rightSidebar.open();
    await this.page.waitForTimeout(1000);
    const processBar = this.replayProcessBar(specName);
    await this.rightSidebar.assertProcessBarVisible(
      processBar,
      "right-sidebar-replay-started",
    );
    await this.rightSidebar.close();
  }

  acceptProxyErrorDialog() {
    this.page.once("dialog", async (dialog) => {
      const allowedMessages = ["Proxy Error"];
      expect(allowedMessages).toContain(dialog.message());
      await dialog.accept();
    });
  }

  async openProxyUrlInNewTab(proxyUrl: string): Promise<Page> {
    const newTab = await this.page.context().newPage();
    await newTab.goto(proxyUrl);
    return newTab;
  }

  async assertProxyStartedAndGetUrl(
    expectedAlertText: string,
  ): Promise<string> {
    return test.step("Assert proxy started and get URL", async () => {
      await this.assertProxyStartedAlert(expectedAlertText);
      return this.getProxyUrl();
    });
  }
}
