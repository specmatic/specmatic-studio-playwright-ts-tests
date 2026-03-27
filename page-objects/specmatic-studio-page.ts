import { Locator, Page, expect, test, type TestInfo } from "@playwright/test";
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
  private readonly proxyErrorAlert: Locator;
  private readonly proxyInfoBox: Locator;
  private readonly proxyTable: Locator;

  private readonly proxyTableRowByPath: (path: string) => Locator;
  private readonly replayBtnByPath: (path: string) => Locator;
  private readonly replayProcessBar: (specName: string) => Locator;
  private readonly stopBtnByPath: (path: string) => Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    super(page, testInfo || ({} as TestInfo), eyes);
    this.leftSidebar = page.locator("#left-sidebar");
    this.sidebarToggleBtn = page.locator("button#left-sidebar-toggle");
    this.specTree = page.locator("#spec-tree");
    this.sideBar = new SideBarPage(page, testInfo, eyes);

    this.recordSpecBtn = page.locator(".left-sidebar-labels .proxy-btn", {
      hasText: "Record a specification",
    });
    this.startProxyBtn = page.locator("#startProxy");
    this.stopProxyBtn = page.locator("#stopProxy");
    this.proxyStartedAlert = page.locator(
      "#alert-container .alert-msg.success",
    );
    this.proxyErrorAlert = page.locator("#alert-container .alert-msg.error");
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
    this.stopBtnByPath = (path) =>
      page
        .locator(`table#proxyTable tbody tr[data-key="${path}-GET"]`)
        .locator("button.proxy-btn[data-value='unmock']");
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
    await takeAndAttachScreenshot(this.page, "clicked-start-proxy");
  }

  async clickStopProxy() {
    await takeAndAttachScreenshot(
      this.page,
      "before-clicked-stop-proxy",
      this.eyes,
    );
    await this.stopProxyBtn.click({ force: true });
    await expect(this.startProxyBtn).toBeVisible({ timeout: 10000 });
    await expect(this.stopProxyBtn).toBeHidden({ timeout: 10000 });
    await takeAndAttachScreenshot(this.page, "clicked-stop-proxy", this.eyes);
  }

  async stopProxyIfRunning() {
    if (await this.stopProxyBtn.isVisible()) {
      await this.clickStopProxy();
    }
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
    await takeAndAttachScreenshot(this.page, "proxy-table-visible");
  }

  async assertProxyTableRowByPath(path: string, expectedCount: number) {
    const row = this.proxyTableRowByPath(path);
    await expect(row).toBeVisible({ timeout: 10000 });
    const countCell = row
      .locator("..")
      .locator(`td[data-key="count"][data-value="${expectedCount}"]`);
    await expect(countCell).toBeVisible({ timeout: 5000 });
  }

  async clickProxyApiFilter() {
    const apiFilterBtn = this.page.locator('li.count[data-type="api"]');
    const pathHeader = this.proxyTable.locator('thead th[data-key="path"]');
    await expect(apiFilterBtn).toBeVisible({ timeout: 5000 });
    await apiFilterBtn.click();
    await expect(pathHeader).toHaveAttribute("data-total", "5", {
      timeout: 10000,
    });
    await takeAndAttachScreenshot(
      this.page,
      "proxy-api-filter-clicked",
      this.eyes,
    );
  }

  async clickReplayForPath(path: string, withVisualValidation = false) {
    const replayBtn = this.replayBtnByPath(path);
    const stopBtn = this.stopBtnByPath(path);
    await expect(replayBtn).toBeVisible({ timeout: 5000 });

    const tryStartReplay = async (): Promise<"started" | "error"> => {
      await replayBtn.click();

      const outcome = await Promise.race([
        stopBtn
          .waitFor({ state: "visible", timeout: 10000 })
          .then(() => "started" as const),
        this.proxyErrorAlert
          .waitFor({ state: "visible", timeout: 10000 })
          .then(() => "error" as const),
      ]);

      return outcome;
    };

    let outcome = await tryStartReplay();

    if (outcome === "error") {
      const errorTitle =
        (await this.proxyErrorAlert.locator("p").textContent())?.trim() ?? "";
      const errorDetails =
        (await this.proxyErrorAlert.locator("pre").textContent())?.trim() ?? "";
      const dismissButton = this.proxyErrorAlert.locator("button").first();

      if (
        errorDetails.includes("ConcurrentModificationException") &&
        (await dismissButton.isVisible().catch(() => false))
      ) {
        await dismissButton.click();
        await expect(this.proxyErrorAlert).toBeHidden({ timeout: 5000 }).catch(
          () => {},
        );
        await this.page.waitForTimeout(1000);
        outcome = await tryStartReplay();
      }

      if (outcome === "error") {
        throw new Error(
          `Replay failed for path '${path}'. ${errorTitle}${errorDetails ? `: ${errorDetails}` : ""}`,
        );
      }
    }

    await expect(stopBtn).toBeVisible({ timeout: 10000 });
    await expect(stopBtn).toHaveText("stop", { timeout: 10000 });
    await takeAndAttachScreenshot(
      this.page,
      "replay-clicked",
      withVisualValidation ? this.eyes : undefined,
    );
  }

  async clickStopReplayForPath(path: string) {
    const stopBtn = this.stopBtnByPath(path);
    await expect(stopBtn).toBeVisible({ timeout: 5000 });
    await stopBtn.click();
    await takeAndAttachScreenshot(this.page, "stop-clicked");
  }

  async assertRightSidebarMockStarted(
    specName: string,
    withVisualValidation?: boolean,
  ) {
    await this.rightSidebar.open();
    await this.page.waitForTimeout(1000);
    const processBar = this.replayProcessBar(specName);
    await this.rightSidebar.assertProcessBarVisible(
      processBar,
      "right-sidebar-replay-started",
      withVisualValidation,
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
