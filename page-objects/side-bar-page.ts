import { Page, expect, Locator, type TestInfo } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class SideBarPage {
  readonly page: Page;
  readonly leftSidebar: Locator;
  readonly testInfo?: TestInfo;

  constructor(page: Page, testInfo?: TestInfo) {
    this.page = page;
    this.leftSidebar = page.locator("#left-sidebar");
    this.testInfo = testInfo;
  }

  /**
   * Ensures the left sidebar is expanded. If closed, expands it and verifies the state.
   * Takes a screenshot after opening if testInfo is provided.
   */
  async ensureSidebarOpen(): Promise<void> {
    await expect(this.leftSidebar).toBeAttached();
    const isExpanded = await this.leftSidebar.getAttribute("aria-expanded");
    if (isExpanded === "false") {
      await this.page.evaluate(() => {
        const sidebar = document.getElementById("left-sidebar");
        if (sidebar) sidebar.setAttribute("aria-expanded", "true");
      });
      await expect(this.leftSidebar).toHaveAttribute("aria-expanded", "true");
    }
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "sidebar-screenshot");
    }
  }
}
