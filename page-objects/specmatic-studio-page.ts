import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { Page, Locator, type TestInfo } from "@playwright/test";
import { BasePage } from "./base-page";

export class SpecmaticStudioPage extends BasePage {
  readonly leftSidebar: Locator;
  readonly sidebarToggleBtn: Locator;
  readonly specTree: Locator;
  readonly testInfo?: TestInfo;

  constructor(page: Page, testInfo?: TestInfo) {
    super(page);
    this.leftSidebar = page.locator("#left-sidebar");
    this.sidebarToggleBtn = page.locator("button#left-sidebar-toggle");
    this.specTree = page.locator("#spec-tree");
    this.testInfo = testInfo;
  }

  async goto() {
    await this.page.goto("/");
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "app-loaded-screenshot");
    }
  }

  async ensureSidebarOpen() {
    const isExpanded = await this.leftSidebar.getAttribute("aria-expanded");
    if (isExpanded === "false") {
      await this.sidebarToggleBtn.click();
    }
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "sidebar-screenshot");
    }
  }

  async waitForSpecTree() {
    await this.specTree.waitFor({ state: "visible", timeout: 4000 });
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "spec-tree-visible-screenshot");
    }
  }

  async selectSpec(specName: string) {
    const specLocator = this.specTree.locator("text=" + specName);
    await specLocator.click({ force: true });
    if (this.testInfo) {
      await takeAndAttachScreenshot(
        this.page,
        `select-spec-${specName}-screenshot`,
      );
    }
    return specLocator;
  }

  async openSpecDetailsTab() {
    const updateTab = this.page.locator('li.tab[data-type="spec"]').first();
    if ((await updateTab.getAttribute("data-active")) !== "true") {
      await updateTab.click({ force: true });
    }
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "spec-details-screenshot");
    }
    return updateTab;
  }

  async selectSpecByName(specName: string) {
    const specLocator = this.specTree.locator("text=" + specName);
    await specLocator.click({ force: true });
    return specLocator;
  }

  async clickRecordSpec() {
    await this.page
      .getByRole("button", { name: /Record a specification/i })
      .click({ force: true });
    if (this.testInfo) {
      await takeAndAttachScreenshot(
        this.page,
        "clicked-record-spec-screenshot",
      );
    }
  }

  async fillTargetUrl(url: string) {
    await this.fillInputByPlaceholder("e.g. https://example.com:3000", url);
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "filled-target-url-screenshot");
    }
  }

  async fillProxyPort(port: string) {
    await this.fillInputByRole("spinbutton", port);
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "filled-proxy-port-screenshot");
    }
  }

  async clickStartProxy() {
    await this.page.locator("#startProxy").click({ force: true });
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "clicked-start-screenshot");
    }
  }

  async clickStopProxy() {
    await this.page.locator("#stopProxy").click({ force: true });
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "clicked-stop-screenshot");
    }
  }
}
