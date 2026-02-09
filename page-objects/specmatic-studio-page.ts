import { Locator, type TestInfo, Page } from "@playwright/test";
import { BasePage } from "./base-page";
import { SideBarPage } from "./side-bar-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class SpecmaticStudioPage extends BasePage {
  readonly leftSidebar: Locator;
  readonly sidebarToggleBtn: Locator;
  readonly sideBar: SideBarPage;
  readonly specTree: Locator;
  readonly testInfo?: TestInfo;
  readonly eyes?: any;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    super(page);
    this.leftSidebar = page.locator("#left-sidebar");
    this.sidebarToggleBtn = page.locator("button#left-sidebar-toggle");
    this.specTree = page.locator("#spec-tree");
    this.testInfo = testInfo;
    this.eyes = eyes;
    this.sideBar = new SideBarPage(page, testInfo, eyes);
  }

  async selectSpec(specName: string) {
    const specLocator = this.specTree.locator("text=" + specName);
    await specLocator.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      `select-spec-${specName}-screenshot`,
      this.eyes,
    );
    return specLocator;
  }

  async openSpecDetailsTab() {
    const updateTab = this.page.locator('li.tab[data-type="spec"]').first();
    if ((await updateTab.getAttribute("data-active")) !== "true") {
      await updateTab.click({ force: true });
    }
    await takeAndAttachScreenshot(
      this.page,
      "spec-details-screenshot",
      this.eyes,
    );
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
    await takeAndAttachScreenshot(
      this.page,
      "clicked-record-spec-screenshot",
      this.eyes,
    );
  }

  async fillTargetUrl(url: string) {
    await this.fillInputByPlaceholder("e.g. https://example.com:3000", url);
    await takeAndAttachScreenshot(
      this.page,
      "filled-target-url-screenshot",
      this.eyes,
    );
  }

  async fillProxyPort(port: string) {
    await this.fillInputByRole("spinbutton", port);
    await takeAndAttachScreenshot(
      this.page,
      "filled-proxy-port-screenshot",
      this.eyes,
    );
  }

  async clickStartProxy() {
    await this.page.locator("#startProxy").click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "clicked-start-screenshot",
      this.eyes,
    );
  }

  async clickStopProxy() {
    await takeAndAttachScreenshot(
      this.page,
      "before-clicked-stop-screenshot",
      this.eyes,
    );
    const stopBtn = this.page.locator("#stopProxy");
    // Only try to stop proxy if the button is visible
    if (await stopBtn.isVisible()) {
      await stopBtn.click({ force: true });
      await takeAndAttachScreenshot(
        this.page,
        "clicked-stop-screenshot",
        this.eyes,
      );
    }
  }
}
