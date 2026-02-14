import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import { Locator, type TestInfo, Page, expect, test } from "@playwright/test";
import { BasePage } from "./base-page";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specs/specNames";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class MockServerPage extends BasePage {
  private readonly openApiTabPage: OpenAPISpecTabPage;

  protected readonly specTree: Locator;
  private readonly runMockServerTab: Locator;
  private readonly specSection: Locator;
  private readonly mockPort: Locator;
  private readonly mockToggleButton: Locator;
  private readonly infoMessageBox: Locator;
  private readonly contractTestBtn: Locator;
  private readonly serviceUrlInput: Locator;
  private readonly mockTabContainer: Locator;
  private readonly contractTabContainer: Locator;
  private readonly mockCountsSection: Locator;
  private readonly mockTableResults: Locator;
  private readonly contractTableResults: Locator;
  private readonly mockTable: Locator;
  private readonly mockTableHead: Locator;
  private readonly contractTable: Locator;
  private readonly drillDownElements: Locator;

  // Helper functions for parameterized locators
  private readonly mockCountByType: (type: string) => Locator;
  private readonly mockTableHeaderByKey: (key: string) => Locator;
  private readonly contractTableResultSpan: (
    row: Locator,
    key: string,
  ) => Locator;
  private readonly mockTableResultSpan: (row: Locator, key: string) => Locator;
  private readonly drillDownHeaderForIndex: (drillDown: Locator) => Locator;
  private readonly drillDownSuccessPillForIndex: (
    drillDown: Locator,
  ) => Locator;
  private readonly drillDownRequestBlock: (drillDown: Locator) => Locator;
  private readonly drillDownResponseBlock: (drillDown: Locator) => Locator;
  private readonly mockTableRemarkCell: (path: string) => Locator;
  private readonly drillDownScenarioTitles: Locator;

  // Helper functions for filter operations
  private readonly mockCountHeaderByType: (type: string) => Locator;
  private readonly mockTableResultRowsByType: (type: string) => Locator;

  // Drill-down back button
  private readonly drillDownBackButton: Locator;

  constructor(page: Page, testInfo: TestInfo, eyes: any, specName: string) {
    super(page, testInfo, eyes, specName);
    this.specTree = page.locator("#spec-tree");
    this.specSection = page.locator(`div[id*="${specName}"]`);
    this.runMockServerTab = this.specSection.locator('li[data-type="mock"]');
    this.openApiTabPage = new OpenAPISpecTabPage(this);
    this.mockPort = this.specSection.locator("#mockPort");
    this.mockToggleButton = this.specSection.locator(
      'button[data-type="mock"]',
    );
    this.infoMessageBox = this.specSection.locator(".info-message-box");
    this.contractTestBtn = this.specSection.locator('li[data-type="test"]');
    this.serviceUrlInput = this.specSection.locator("#testBaseUrl");

    this.mockTabContainer = this.specSection.locator(
      '.tab-pane[data-type="mock"], .mock-container',
    );
    this.contractTabContainer = this.specSection.locator(
      '.tab-pane[data-type="test"], .test-container',
    );
    this.mockCountsSection = this.specSection.locator("ol.counts");
    this.mockTableResults = this.mockTabContainer.locator(
      'table#mock td[data-key="result"]',
    );
    this.contractTableResults = this.contractTabContainer.locator(
      'table#test td[data-key="result"]',
    );
    this.mockTable = this.specSection.locator("table#mock");
    this.mockTableHead = this.mockTable.locator("thead");
    this.contractTable = this.contractTabContainer.locator("table#test");
    this.drillDownElements = this.page.locator("drill-down");

    // Initialize helper functions for parameterized locators
    this.mockCountByType = (type: string) =>
      this.mockCountsSection
        .locator(`li[data-type="${type}"] span[data-value]`)
        .first();

    this.mockTableHeaderByKey = (key: string) =>
      this.mockTableHead.locator(`th[data-key="${key}"]`);

    this.contractTableResultSpan = (row: Locator, key: string) =>
      row.locator(`span[data-key="${key}"]`);

    this.mockTableResultSpan = (row: Locator, key: string) =>
      row.locator(`span[data-key="${key}"]`);

    this.drillDownHeaderForIndex = (drillDown: Locator) =>
      drillDown.locator(".header");

    this.drillDownSuccessPillForIndex = (drillDown: Locator) =>
      drillDown.locator(".header .meta .pill.green:has-text('Success')");

    this.drillDownRequestBlock = (drillDown: Locator) =>
      drillDown.locator(".req-res-block.req-res-block--request");

    this.drillDownResponseBlock = (drillDown: Locator) =>
      drillDown.locator(".req-res-block.req-res-block--response");

    this.mockTableRemarkCell = (path: string) =>
      this.mockTable
        .locator(
          `tbody tr:has(td[data-key="path"][data-value="${path}"]:has-text("${path}")) td[data-key="remark"]`,
        )
        .first();

    this.drillDownScenarioTitles =
      this.drillDownElements.locator("> .header > .title");

    // Initialize helper functions for filter operations
    this.mockCountHeaderByType = (type: string) =>
      this.mockCountsSection.locator(`li[data-type="${type}"]`).first();

    this.mockTableResultRowsByType = (type: string) =>
      this.mockTable.locator(
        `tbody tr:has(td[data-key="result"] span[data-key="${type}"][data-value]:not([data-value="0"]))`,
      );

    this.drillDownBackButton = this.specSection
      .locator(".header")
      .getByRole("button", { name: "Go Back" })
      .first();
  }

  async openRunMockServerTab() {
    await this.gotoHome();
    await this.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
    await takeAndAttachScreenshot(this.page, "mock-tab-open", this.eyes);
    return this.openApiTabPage.openRunMockServerTab();
  }

  async fillMockPort(port?: number) {
    await this.mockPort.clear();
    if (port) {
      await this.mockPort.fill(port.toString());
      await takeAndAttachScreenshot(this.page, "entered Mock port", this.eyes);
    }
  }

  async startMockServer() {
    const isRunning = await this.mockToggleButton.getAttribute("data-running");
    if (isRunning === "false") {
      await this.mockToggleButton.click();
      await takeAndAttachScreenshot(
        this.page,
        "mock-server-started",
        this.eyes,
      );
    }
  }

  async stopMockServer() {
    const isRunning = await this.mockToggleButton.getAttribute("data-running");

    if (isRunning === "true") {
      await this.mockToggleButton.click();

      await takeAndAttachScreenshot(
        this.page,
        "mock-server-stopped",
        this.eyes,
      );
    }
  }

  async getMockURL(): Promise<string> {
    await expect(this.infoMessageBox).toHaveText(/https?:\/\//, {
      timeout: 10000,
    });

    const fullText = await this.infoMessageBox.innerText();

    const urlMatch = fullText.match(/https?:\/\/[^\s]+/);

    if (!urlMatch) {
      throw new Error(`Failed to extract URL from text: "${fullText}"`);
    }

    const rawUrl = urlMatch[0];

    await takeAndAttachScreenshot(this.page, "mock-url-extraction", this.eyes);

    return rawUrl;
  }

  async clickContractTests() {
    await this.contractTestBtn.click();
    await takeAndAttachScreenshot(this.page, "navigated-to-contract-tests");
  }

  async clickMockServerTab() {
    await this.runMockServerTab.click();
    await this.mockCountsSection
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await takeAndAttachScreenshot(
      this.page,
      "navigated-back-to-mock-tab",
      this.eyes,
    );
  }

  async enterServiceBaseURL(serviceUrl: string) {
    await expect(this.serviceUrlInput).toBeVisible({ timeout: 4000 });
    await this.serviceUrlInput.fill(serviceUrl);
    await takeAndAttachScreenshot(this.page, "service-url-entered", this.eyes);
  }

  async getMockTableResults() {
    const rows = await this.mockTableResults.all();

    const totals = {
      success: 0,
      failed: 0,
      error: 0,
      notcovered: 0,
      skipped: 0,
      total: 0,
    };
    for (const row of rows) {
      const s = await this.mockTableResultSpan(row, "success").getAttribute(
        "data-value",
      );
      totals.success += parseInt(s || "0", 10);
    }
    return totals;
  }

  async getContractTableResults() {
    const rows = await this.contractTableResults.all();

    const totals = { success: 0, failed: 0, total: 0, notcovered: 0 };
    for (const row of rows) {
      const [s, f, t, n] = await Promise.all([
        this.contractTableResultSpan(row, "success").getAttribute("data-value"),
        this.contractTableResultSpan(row, "failed").getAttribute("data-value"),
        this.contractTableResultSpan(row, "total").getAttribute("data-value"),
        this.contractTableResultSpan(row, "notcovered").getAttribute(
          "data-value",
        ),
      ]);
      totals.success += parseInt(s || "0", 10);
      totals.failed += parseInt(f || "0", 10);
      totals.total += parseInt(t || "0", 10);
      totals.notcovered += parseInt(n || "0", 10);
    }
    return totals;
  }

  async getMockSummaryHeaderValue(
    type: "success" | "failed" | "error" | "notcovered" | "excluded" | "total",
  ): Promise<number> {
    const countElement = this.mockCountByType(type);

    await countElement.waitFor({ state: "visible", timeout: 10000 });

    const value = await countElement.getAttribute("data-value");
    return parseInt(value || "0", 10);
  }

  async getMockSummaryHeaderTotals() {
    const keys = [
      "success",
      "failed",
      "error",
      "notcovered",
      "excluded",
      "total",
    ] as const;

    const values = await Promise.all(
      keys.map((key) => this.getMockSummaryHeaderValue(key)),
    );

    return {
      success: values[0],
      failed: values[1],
      error: values[2],
      notcovered: values[3],
      excluded: values[4],
      total: values[5],
    };
  }

  async getMockTableHeadersData() {
    const keys = ["coverage", "path", "method", "response"] as const;
    const headerData: any = {};

    for (const key of keys) {
      const element = this.mockTableHeaderByKey(key);
      await element.waitFor({ state: "visible", timeout: 5000 });

      headerData[key] = {
        text: await element.innerText(),
        total: await element.getAttribute("data-total"),
        enabled: await element.getAttribute("data-enabled"),
        disabled: await element.getAttribute("data-disabled"),
      };
    }

    return headerData;
  }

  async clickMockTableRemark(
    path: string,
    responseCode: string,
  ): Promise<void> {
    const remarkCell = this.mockTableRemarkCell(path);

    await remarkCell.waitFor({ state: "visible", timeout: 5000 });
    await remarkCell.click();
    await takeAndAttachScreenshot(
      this.page,
      `drill-down-opened-${path}`,
      this.eyes,
    );
  }

  // Drill-Down Scenario Assertions

  async goBackFromDrillDown(): Promise<void> {
    await this.drillDownBackButton.waitFor({ state: "visible", timeout: 5000 });
    await this.drillDownBackButton.click();
    await takeAndAttachScreenshot(
      this.page,
      "drill-down-closed-back-button",
      this.eyes,
    );
  }

  async getTotalDrillDownCount(): Promise<number> {
    return await this.drillDownElements.count();
  }

  async areAllDrillDownsSuccess(): Promise<boolean> {
    const drillDowns = await this.drillDownElements.all();
    const successPills = await this.page
      .locator("drill-down .header .pill.green:has-text('Success')")
      .count();
    return successPills === drillDowns.length;
  }

  async getDrillDownState(index: number) {
    const drillDowns = await this.drillDownElements.all();
    const drillDown = drillDowns[index];

    await drillDown.scrollIntoViewIfNeeded();

    await this.page.waitForTimeout(500);

    const isOpen = await drillDown.getAttribute("open");
    if (isOpen === null) {
      await this.drillDownHeaderForIndex(drillDown).click();
    }

    const reqBlock = this.drillDownRequestBlock(drillDown);
    const resBlock = this.drillDownResponseBlock(drillDown);

    await reqBlock.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});

    await this.page.waitForTimeout(300);

    await takeAndAttachScreenshot(
      this.page,
      `drill-down-expanded-index-${index}`,
      this.eyes,
    );

    const state = {
      requestVisible: await reqBlock.isVisible(),
      responseVisible: await resBlock.isVisible(),
    };

    await this.page.waitForTimeout(500);

    await this.drillDownHeaderForIndex(drillDown).click();

    await takeAndAttachScreenshot(
      this.page,
      `drill-down-collapsed-index-${index}`,
      this.eyes,
    );

    return state;
  }

  async clickMockFilterHeader(
    filterType: "success" | "failed" | "error" | "notcovered" | "total",
  ): Promise<void> {
    const filterHeader = this.mockCountHeaderByType(filterType);
    await filterHeader.click();
    await takeAndAttachScreenshot(
      this.page,
      `mock-filter-applied-${filterType}`,
      this.eyes,
    );
  }

  async verifyMockFilterIsApplied(
    filterType: "success" | "failed" | "error" | "notcovered" | "total",
  ): Promise<void> {
    const countsSection = this.mockCountsSection
      .filter({ has: this.page.locator(`li[data-type="${filterType}"]`) })
      .first();
    const hasData = await countsSection.getAttribute("data-filter");
    const activeElement = this.mockCountHeaderByType(filterType);
    const isActive = await activeElement.getAttribute("data-active");

    expect(
      hasData,
      `Mock counts section should have data-filter="${filterType}"`,
    ).toBe(filterType);
    expect(
      isActive,
      `Filter header for ${filterType} should be marked as active`,
    ).toBe("true");

    await takeAndAttachScreenshot(
      this.page,
      `mock-filter-verified-${filterType}`,
      this.eyes,
    );
  }

  async getFilteredMockResultCount(
    filterType: "success" | "failed" | "total",
  ): Promise<number> {
    const rows = await this.mockTableResultRowsByType(filterType).all();

    let totalSum = 0;

    for (const row of rows) {
      const value = await row
        .locator(`span[data-key="${filterType}"]`)
        .getAttribute("data-value");

      totalSum += parseInt(value || "0", 10);
    }

    console.log(
      `Debug - Filter: ${filterType}, Rows found: ${rows.length}, Total Sum: ${totalSum}`,
    );
    return totalSum;
  }

  async verifyMockFilterCountMatches(
    filterType: "success" | "failed" | "total",
  ) {
    await this.clickMockFilterHeader(filterType);
    await this.verifyMockFilterIsApplied(filterType);

    await this.page.waitForTimeout(500);

    const headerCount = await this.getMockSummaryHeaderValue(filterType);
    const filteredCount = await this.getFilteredMockResultCount(filterType);

    return { headerCount, filteredCount };
  }
}
