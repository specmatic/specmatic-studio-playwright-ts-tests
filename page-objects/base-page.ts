import { test, expect, type TestInfo, Locator, Page } from "@playwright/test";
import type { SideBarPage } from "./side-bar-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class BasePage {
  readonly page: Page;
  readonly sideBar: SideBarPage;
  readonly testInfo?: TestInfo;
  readonly eyes?: any;
  readonly specTree?: Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.page = page;
    this.testInfo = testInfo;
    this.eyes = eyes;
    // Dynamically require SideBarPage to avoid circular dependency
    const SideBarPageClass = require("./side-bar-page").SideBarPage;
    this.sideBar = new SideBarPageClass(page, testInfo, eyes);
  }

  async gotoHomeAndOpenSidebar() {
    await test.step("Open sidebar", async () => {
      await this.page.goto("/");
      await this.sideBar.ensureSidebarOpen();
    });
  }

  async goto() {
    await this.page.goto("/");
    await takeAndAttachScreenshot(
      this.page,
      "app-loaded-screenshot",
      this.eyes,
    );
  }

  async clickButtonByText(text: string) {
    const btn = this.page.getByText(new RegExp(text, "i"));
    await btn.click({ force: true });
    return btn;
  }

  async fillInputByPlaceholder(placeholder: string, value: string) {
    const input = this.page.getByPlaceholder(placeholder);
    await input.fill(value);
    return input;
  }

  async fillInputByRole(role: string, value: string) {
    const input = this.page.getByRole(role as any);
    await input.fill(value);
    return input;
  }

  /**
   * Opens a tab by locator, if not already active, and takes a screenshot.
   * @param tabLocator Locator for the tab to open
   * @param screenshotName Name for the screenshot
   */
  private async openTab(
    tabLocator: Locator | undefined,
    screenshotName: string,
  ): Promise<Locator> {
    return await test.step(`Open tab: ${screenshotName}`, async () => {
      if (!tabLocator) {
        await takeAndAttachScreenshot(
          this.page,
          `error-missing-locator-${screenshotName}`,
          this.eyes,
        );
        throw new Error(`Tab locator is not defined for ${screenshotName}`);
      }
      // Wait for the element to be visible before interacting
      try {
        await tabLocator.waitFor({ state: "visible", timeout: 10000 });
      } catch (e) {
        await takeAndAttachScreenshot(
          this.page,
          `error-not-visible-${screenshotName}`,
          this.eyes,
        );
        throw new Error(`Tab/Button for ${screenshotName} not visible: ${e}`);
      }
      // If the locator is a tab (has data-active or role=tab), check data-active, else just click
      let isTab = false;
      try {
        const role = await tabLocator.getAttribute("role");
        const dataType = await tabLocator.getAttribute("data-type");
        if (
          role === "tab" ||
          dataType === "spec" ||
          dataType === "example-generation"
        ) {
          isTab = true;
        }
      } catch {}
      if (isTab) {
        if ((await tabLocator.getAttribute("data-active")) !== "true") {
          await tabLocator.click({ force: true });
        }
      } else {
        // For buttons, just click if enabled
        await tabLocator.click({ force: true });
      }
      await takeAndAttachScreenshot(this.page, screenshotName, this.eyes);
      return tabLocator;
    });
  }

  /**
   * Opens the spec details tab (header tab) if not already open, and takes a screenshot.
   * Optionally accepts a custom locator for the tab.
   */
  async openSpecTab(tabLocator?: Locator) {
    const locator =
      tabLocator ?? this.page.locator('li.tab[data-type="spec"]').first();
    return this.openTab(locator, "spec-details-screenshot");
  }

  /**
   * Clicks the Generate Examples button/tab if not already active, and takes a screenshot.
   * Requires the page object to have a generateExamplesBtn property, or pass a locator.
   */
  async openExampleGenerationTab(tabLocator?: Locator) {
    const locator =
      tabLocator ?? ((this as any).generateExamplesBtn as Locator | undefined);
    return this.openTab(locator, "clicked-generate-examples-screenshot");
  }

  /**
   * Clicks the Run Mock Server tab/button if not already active, and takes a screenshot.
   * Requires the page object to have a runMockServerTab property, or pass a locator.
   */
  async openRunMockServerTab(tabLocator?: Locator) {
    const locator =
      tabLocator ?? ((this as any).runMockServerTab as Locator | undefined);
    return this.openTab(locator, "run-mock-server-tab-screenshot");
  }

  /**
   * Clicks the Execute Contract Tests button/tab if not already active, and takes a screenshot.
   * Requires the page object to have a testBtn property, or pass a locator.
   */
  async openExecuteContractTestsTab(tabLocator?: Locator) {
    const locator =
      tabLocator ?? ((this as any).testBtn as Locator | undefined);
    return this.openTab(locator, "clicked-execute-tests-screenshot");
  }
}
