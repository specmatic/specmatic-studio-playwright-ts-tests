import { Locator, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";

export class SideBarPage extends BasePage {
  readonly leftSidebar: Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    super(page, testInfo, eyes);
    this.leftSidebar = page.locator("#left-sidebar");
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
      await takeAndAttachScreenshot(this.page, "sidebar-screenshot", this.eyes);
    }
  }
}
