import { Locator, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";
import { SideBarPage } from "./side-bar-page";

export class SpecmaticStudioPage extends BasePage {
  readonly leftSidebar: Locator;
  readonly sidebarToggleBtn: Locator;
  readonly sideBar: SideBarPage;
  readonly specTree: Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    super(page, testInfo || ({} as TestInfo), eyes);
    this.leftSidebar = page.locator("#left-sidebar");
    this.sidebarToggleBtn = page.locator("button#left-sidebar-toggle");
    this.specTree = page.locator("#spec-tree");
    this.sideBar = new SideBarPage(page, testInfo, eyes);
  }

  async clickRecordSpec() {
    await this.page
      .getByRole("button", { name: /Record a specification/i })
      .click({ force: true });
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
    await this.page.locator("#startProxy").click({ force: true });
    await takeAndAttachScreenshot(this.page, "clicked-start", this.eyes);
  }

  async clickStopProxy() {
    await takeAndAttachScreenshot(this.page, "before-clicked-stop", this.eyes);
    const stopBtn = this.page.locator("#stopProxy");
    // Only try to stop proxy if the button is visible
    if (await stopBtn.isVisible()) {
      await stopBtn.click({ force: true });
      await takeAndAttachScreenshot(this.page, "clicked-stop", this.eyes);
    }
  }
}
