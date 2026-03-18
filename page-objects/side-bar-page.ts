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

  async ensureSidebarOpen(withVisualValidation = false): Promise<void> {
    console.log("\tEnsuring sidebar is open");
    await expect(this.leftSidebar).toBeAttached();
    const isExpanded = await this.leftSidebar.getAttribute("aria-expanded");
    if (isExpanded === "false") {
      await this.page.evaluate(() => {
        const sidebar = document.getElementById("left-sidebar");
        if (sidebar) sidebar.setAttribute("aria-expanded", "true");
      });
      await expect(this.leftSidebar).toHaveAttribute("aria-expanded", "true");
      await takeAndAttachScreenshot(
        this.page,
        "sidebar-opened",
        withVisualValidation ? this.eyes : undefined,
      );
    }
  }

  async selectSpec(specName: string): Promise<Locator> {
    const parts = specName.split("/");
    const fileName = parts[parts.length - 1];
    const folderPath = parts.slice(0, -1);
    const specLocator = this.page
      .locator("#spec-tree")
      .locator(`span.wb-title[title="${fileName}"]`);

    await test.step(`Maps to Service Spec: '${specName}'`, async () => {
      await this.ensureSidebarOpen();
      await this.page.waitForTimeout(500);

      for (let i = 0; i < folderPath.length; i++) {
        const folder = folderPath[i];
        const folderRow = this.page
          .locator("#spec-tree")
          .locator(`div.wb-row:has(span.wb-title[title="${folder}"])`);

        await folderRow.waitFor({ state: "visible", timeout: 5000 });

        const classes = (await folderRow.getAttribute("class")) ?? "";
        if (!classes.includes("wb-expanded")) {
          const expander = folderRow.locator("i.wb-expander");
          if ((await expander.count()) > 0) {
            await expander.click();
          } else {
            await folderRow.click();
          }

          const nextLabel =
            i + 1 < folderPath.length ? folderPath[i + 1] : fileName;
          await this.page
            .locator("#spec-tree")
            .locator(`span.wb-title[title="${nextLabel}"]`)
            .waitFor({ state: "visible", timeout: 5000 });
        }
      }

      await expect(specLocator).toBeVisible({ timeout: 5000 });

      await specLocator.evaluate((node) =>
        node.scrollIntoView({ block: "center", behavior: "smooth" }),
      );

      await specLocator.click();

      await this.closeSidebar();
    });
    return specLocator;
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
