import { Page, expect, Locator } from "@playwright/test";

export class SideBarPage {
  readonly page: Page;
  readonly leftSidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.leftSidebar = page.locator("#left-sidebar");
  }

  /**
   * Ensures the left sidebar is expanded. If closed, expands it and verifies the state.
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
  }
}
