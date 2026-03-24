import { Locator, expect, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class RightSidebarPage {
  private readonly toggle: Locator;
  private readonly page: Page;
  private readonly eyes?: any;

  constructor(page: Page, eyes?: any) {
    this.page = page;
    this.eyes = eyes;
    this.toggle = page.locator("#right-sidebar-toggle");
  }

  async open(): Promise<void> {
    await this.toggle.click();
    await this.page.waitForTimeout(500);
  }

  async close(): Promise<void> {
    await this.page.locator("body").click({ position: { x: 100, y: 100 } });
    await this.page.waitForTimeout(500);
  }

  async assertProcessBarVisible(
    processBarLocator: Locator,
    screenshotLabel: string,
    withVisualValidation = false,
  ): Promise<void> {
    await expect(processBarLocator).toBeVisible({ timeout: 15000 });
    await takeAndAttachScreenshot(
      this.page,
      screenshotLabel,
      withVisualValidation ? this.eyes : undefined,
    );
  }
}
