import {
  test,
  expect,
  type TestInfo,
  Locator,
  Page,
  FrameLocator,
} from "@playwright/test";
import type { SideBarPage } from "./side-bar-page";
import { RightSidebarPage } from "./right-sidebar-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class BasePage {
  protected readonly page: Page;
  readonly sideBar: SideBarPage;
  readonly rightSidebar: RightSidebarPage;
  protected readonly testInfo: TestInfo;
  protected readonly eyes: any;
  protected readonly specTree?: Locator;
  protected readonly specName?: string;
  private readonly rightSidebarToggle: Locator;
  private readonly activityBadge: Locator;

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
    this.rightSidebar = new RightSidebarPage(page, eyes);
    this.rightSidebarToggle = page.locator("#right-sidebar-toggle");
    this.activityBadge = page.locator("#activity-badge");
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

      await this.waitForTabContentReady(dataType);
      await takeAndAttachScreenshot(this.page, screenshotName);
      return tabLocator;
    });
  }

  private async waitForTabContentReady(dataType: string | null): Promise<void> {
    const timeout = 15000;

    if (dataType === "test") {
      await this.waitForAnyVisible(
        [
          '.tab-pane[data-type="test"][data-active="true"] table#test',
          '[data-type="test"] table#test',
          'table#test',
          '[data-type="test"] .header ol.counts',
        ],
        timeout,
      );
      await this.waitForTableStructure("table#test");
      return;
    }

    if (dataType === "mock") {
      await this.waitForAnyVisible(
        [
          '.tab-pane[data-type="mock"][data-active="true"] table#mock',
          '[data-type="mock"] table#mock',
          'table#mock',
          '[data-type="mock"] .header ol.counts',
        ],
        timeout,
      );
      await this.waitForTableStructure("table#mock");
      return;
    }

    if (dataType === "example") {
      await this.waitForAnyVisible(
        [
          "iframe[data-examples-server-base]",
          "#valid-examples-table",
          "#invalid-examples-table",
        ],
        timeout,
      );
      return;
    }

    if (dataType === "spec") {
      await this.waitForAnyVisible(
        [".cm-content", ".cm-editor", ".CodeMirror", "textarea"],
        timeout,
      );
      return;
    }

    await this.page.waitForLoadState("networkidle", { timeout: 3000 }).catch(
      () => {},
    );
  }

  private async waitForAnyVisible(
    selectors: string[],
    timeout: number,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          for (const selector of selectors) {
            const locator = this.page.locator(selector).first();
            if (await locator.isVisible().catch(() => false)) {
              return true;
            }
          }
          return false;
        },
        {
          timeout,
          intervals: [200, 400, 800],
          message: `Waiting for visible selector from: ${selectors.join(", ")}`,
        },
      )
      .toBeTruthy();
  }

  private async waitForTableStructure(tableSelector: string): Promise<void> {
    const table = this.page.locator(tableSelector).first();
    await table.waitFor({ state: "visible", timeout: 15000 });

    await expect
      .poll(
        async () => {
          const [tbodyCount, rowCount, cellCount, generated] = await Promise.all(
            [
              table.locator("tbody").count(),
              table.locator("tbody tr").count(),
              table.locator("tbody td").count(),
              table.getAttribute("data-generated"),
            ],
          );

          return (
            tbodyCount > 0 ||
            rowCount > 0 ||
            cellCount > 0 ||
            generated !== null
          );
        },
        {
          timeout: 5000,
          intervals: [150, 300, 600],
          message: `Waiting for table structure to load: ${tableSelector}`,
        },
      )
      .toBeTruthy();
  }
}
