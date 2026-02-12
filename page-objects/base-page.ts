import {
  test,
  expect,
  type TestInfo,
  Locator,
  Page,
  FrameLocator,
} from "@playwright/test";
import type { SideBarPage } from "./side-bar-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class BasePage {
  protected readonly page: Page;
  readonly sideBar: SideBarPage;
  protected readonly testInfo: TestInfo;
  protected readonly eyes: any;
  protected readonly specTree?: Locator;
  protected readonly specName?: string;

  protected constructor(
    page: Page,
    testInfo: TestInfo,
    eyes: any,
    specName?: string,
  ) {
    this.page = page;
    this.testInfo = testInfo;
    this.eyes = eyes;
    this.specName = specName;
    const SideBarPageClass = require("./side-bar-page").SideBarPage;
    this.sideBar = new SideBarPageClass(page, testInfo, eyes);
  }

  async gotoHomeAndOpenSidebar() {
    await test.step("Open sidebar", async () => {
      await this.page.goto("/");
      await this.sideBar.ensureSidebarOpen();
    });
  }

  protected async gotoHome() {
    console.log("\tNavigating to home page: '/'");
    await this.page.goto("/");
    await takeAndAttachScreenshot(this.page, "app-loaded");
  }

  protected async clickButtonByText(text: string) {
    const btn = this.page.getByText(new RegExp(text, "i"));
    await btn.click({ force: true });
    return btn;
  }

  protected async fillInputByPlaceholder(placeholder: string, value: string) {
    const input = this.page.getByPlaceholder(placeholder);
    await input.fill(value);
    return input;
  }

  protected async fillInputByRole(role: string, value: string) {
    const input = this.page.getByRole(role as any);
    await input.fill(value);
    return input;
  }

  /**
   * Opens a tab by locator, if not already active, and takes a screenshot.
   * @param tabLocator Locator for the tab to open
   * @param screenshotName Name for the screenshot
   */
  protected async openTab(
    tabLocator: Locator | undefined,
    screenshotName: string,
  ): Promise<Locator> {
    return await test.step(`Open tab: ${screenshotName}`, async () => {
      console.log(`\tOpening tab with locator: ${tabLocator?.toString()}`);
      if (!tabLocator) {
        await takeAndAttachScreenshot(
          this.page,
          `error-missing-locator-${screenshotName}`,
        );
        throw new Error(`Tab locator is not defined for ${screenshotName}`);
      }
      await tabLocator.waitFor({ state: "visible", timeout: 10000 });

      // Determine if this is a tab by checking attributes
      const [role, dataType, dataActive] = await Promise.all([
        tabLocator.getAttribute("role"),
        tabLocator.getAttribute("data-type"),
        tabLocator.getAttribute("data-active"),
      ]);
      const isTab =
        role === "tab" ||
        dataType === "spec" ||
        dataType === "example-generation";

      if (isTab) {
        if (dataActive !== "true") {
          await tabLocator.click({ force: true });
        }
      } else {
        await tabLocator.click({ force: true });
      }
      await takeAndAttachScreenshot(this.page, screenshotName, this.eyes);
      return tabLocator;
    });
  }
}
