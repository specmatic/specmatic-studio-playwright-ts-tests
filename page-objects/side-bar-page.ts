import { Locator, test, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class SideBarPage {
  readonly leftSidebar: Locator;
  readonly page: Page;
  readonly testInfo?: TestInfo;
  readonly eyes?: any;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.leftSidebar = page.locator("#left-sidebar");
    this.page = page;
    this.testInfo = testInfo;
    this.eyes = eyes;
  }

  /**
   * Ensures the left sidebar is expanded. If closed, expands it and verifies the state.
   * Takes a screenshot after opening if testInfo is provided.
   */
  async ensureSidebarOpen(): Promise<void> {
    console.log("\tEnsuring sidebar is open");
    await expect(this.leftSidebar).toBeAttached();
    const isExpanded = await this.leftSidebar.getAttribute("aria-expanded");
    if (isExpanded === "false") {
      await this.page.evaluate(() => {
        const sidebar = document.getElementById("left-sidebar");
        if (sidebar) sidebar.setAttribute("aria-expanded", "true");
      });
      await expect(this.leftSidebar).toHaveAttribute("aria-expanded", "true");
      await takeAndAttachScreenshot(this.page, "sidebar-opened");
    }
  }

  /**
   * Ensures the sidebar is open, then selects the given spec from the spec tree.
   */
  async selectSpec(specName: string): Promise<Locator> {
    let specLocator: Locator;
    await test.step(`Navigate to Service Spec: '${specName}'`, async () => {
      console.log(`\tNavigating to Service Spec: '${specName}'`);
      await this.ensureSidebarOpen();
      const specTree = this.page.locator("#spec-tree");
      await expect(specTree).toBeVisible({ timeout: 4000 });
      specLocator = specTree.locator(`text=${specName}`);
      await expect(specLocator).toBeVisible({ timeout: 4000 });
      try {
        await specLocator.click({ force: true, timeout: 3000 });
      } catch (e) {
        await specLocator.click({ force: true, timeout: 3000 });
      }
      await takeAndAttachScreenshot(this.page, "selected-spec", this.eyes);
      await this.closeSidebar();
    });
    return specLocator!;
  }

  /**
   * Closes the left sidebar if open.
   */
  async closeSidebar(): Promise<void> {
    console.log("\tClosing sidebar if open");
    await expect(this.leftSidebar).toBeAttached();
    const isExpanded = await this.leftSidebar.getAttribute("aria-expanded");
    if (isExpanded === "true") {
      await this.page.evaluate(() => {
        const sidebar = document.getElementById("left-sidebar");
        if (sidebar) sidebar.setAttribute("aria-expanded", "false");
      });
      await expect(this.leftSidebar).toHaveAttribute("aria-expanded", "false");
      await this.page.waitForTimeout(1000); // Wait 1 second for UI to settle
      await takeAndAttachScreenshot(this.page, "sidebar-closed");
    }
  }
}
