import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import { Locator, type TestInfo, Page, expect } from "@playwright/test";
import { BasePage } from "./base-page";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specs/specNames";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class MockServerPage extends BasePage {
  private readonly openApiTabPage: OpenAPISpecTabPage;

  readonly specTree: Locator;
  readonly runMockServerTab: Locator;
  private readonly specSection: Locator;
  protected readonly mockPort: Locator;
  public readonly mockToggleButton: Locator;
  protected readonly infoMessageBox: Locator;

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
  }

  async openRunMockServerTab() {
    await this.gotoHome();
    await this.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
    await takeAndAttachScreenshot(this.page, "mock-tab-open");
    return this.openApiTabPage.openRunMockServerTab();
  }

  async fillMockPort(port?: number) {
    await this.mockPort.clear();
    if (port) {
      await this.mockPort.fill(port.toString());
      await takeAndAttachScreenshot(this.page, "entered Mock port");
    }
  }

  async startMockServer() {
    const isRunning = await this.mockToggleButton.getAttribute("data-running");
    if (isRunning === "false") {
      await this.mockToggleButton.click();
      await takeAndAttachScreenshot(this.page, "mock-server-started");
    }
  }

  async stopMockServer() {
    const isRunning = await this.mockToggleButton.getAttribute("data-running");

    if (isRunning === "true") {
      await this.mockToggleButton.click();

      await takeAndAttachScreenshot(this.page, "mock-server-stopped");
    }
  }

  async getMockURL(): Promise<string> {
    await expect(this.infoMessageBox).toBeVisible({ timeout: 10000 });

    const fullText = await this.infoMessageBox.innerText();

    const urlMatch = fullText.match(/https?:\/\/[^\s]+/);

    if (!urlMatch) {
      throw new Error(`Failed to extract URL from text: "${fullText}"`);
    }

    const rawUrl = urlMatch[0];

    return rawUrl;
  }
}
