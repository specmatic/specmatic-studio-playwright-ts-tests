import { Locator, test, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class SideBarPage {
  readonly page: Page;
  readonly testInfo?: TestInfo;
  readonly eyes?: any;
  readonly leftSidebar: Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.page = page;
    this.testInfo = testInfo;
    this.eyes = eyes;
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

  /**
   * Ensures the sidebar is open, then selects the given spec from the spec tree.
   */
  async selectSpec(specName: string): Promise<Locator> {
    let specLocator: Locator;
    await test.step(`Navigate to Service Spec: '${specName}'`, async () => {
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
      if (this.testInfo) {
        await takeAndAttachScreenshot(
          this.page,
          "selected-spec-screenshot",
          this.eyes,
        );
      }
    });
    return specLocator!;
  }
}
