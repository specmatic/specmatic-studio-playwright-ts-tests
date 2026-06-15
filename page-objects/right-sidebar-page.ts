import { Locator, expect, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class RightSidebarPage {
  private readonly toggle: Locator;
  private readonly page: Page;
  private readonly eyes?: any;
  readonly activeTabsTitle: Locator;
  readonly exportAsConfigButton: Locator;
  readonly exportUpgradeModalContainer: Locator;
  readonly exportUpgradeModal: Locator;
  readonly exportUpgradeModalTitle: Locator;
  readonly exportUpgradeMessage: Locator;
  readonly keepV2Button: Locator;
  readonly upgradeToV3Button: Locator;
  readonly exportSuccessAlert: Locator;
  readonly exportSuccessTitle: Locator;

  constructor(page: Page, eyes?: any) {
    this.page = page;
    this.eyes = eyes;
    this.toggle = page.locator("#right-sidebar-toggle");
    this.activeTabsTitle = page.locator(".right-sidebar-title-row .h5");
    this.exportAsConfigButton = page.locator("#exportSpecmaticBtn");
    this.exportUpgradeModalContainer = page.locator("#exportUpgradeModal");
    this.exportUpgradeModal = page.locator(".modal-content").filter({
      has: page.locator("#exportUpgradeModalLabel"),
    });
    this.exportUpgradeModalTitle = page.locator("#exportUpgradeModalLabel");
    this.exportUpgradeMessage = page.locator("#exportUpgradeMessage");
    this.keepV2Button = page.locator("#declineExportUpgradeBtn");
    this.upgradeToV3Button = page.locator("#confirmExportUpgradeBtn");
    this.exportSuccessAlert = page.locator(
      "#alert-container .alert-msg.success, .alert-msg.success",
    );
    this.exportSuccessTitle = this.exportSuccessAlert.locator("p").first();
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
    await expect(processBarLocator).toBeVisible({ timeout: 30000 });
    await takeAndAttachScreenshot(
      this.page,
      screenshotLabel,
      withVisualValidation ? this.eyes : undefined,
    );
  }

  async openExportAsConfigDialog(): Promise<"dialog" | "exported"> {
    await this.open();
    await expect(this.activeTabsTitle).toHaveText("Active Tabs", {
      timeout: 10000,
    });
    await expect(this.exportAsConfigButton).toBeVisible({ timeout: 10000 });
    await this.clickExportAsConfigButton();

    const startedAt = Date.now();
    while (Date.now() - startedAt < 10000) {
      const modalVisible = await this.exportUpgradeModalTitle
        .isVisible()
        .catch(() => false);
      if (modalVisible) {
        return "dialog";
      }

      const exportSucceeded = await this.exportSuccessTitle
        .isVisible()
        .catch(() => false);
      if (exportSucceeded) {
        return "exported";
      }

      await this.page.waitForTimeout(400);
    }

    throw new Error(
      "Export as config did not open the upgrade dialog or show a success toast",
    );
  }

  async assertExportUpgradeDialog(): Promise<void> {
    await expect(this.exportUpgradeModalContainer).toBeVisible({
      timeout: 10000,
    });
    await expect(this.exportUpgradeModalTitle).toBeVisible({ timeout: 10000 });
    await expect(this.exportUpgradeModalTitle).toHaveText(
      "Upgrade Specmatic Config",
    );
    await expect(this.exportUpgradeMessage).toHaveText(
      "Current config is Specmatic V2. Do you want to upgrade to V3 before exporting workflow?",
    );
    await expect(this.keepV2Button).toBeVisible();
    await expect(this.upgradeToV3Button).toBeVisible();
    await takeAndAttachScreenshot(this.page, "export-config-upgrade-dialog");
  }

  async confirmExportUpgrade(): Promise<void> {
    await expect(this.upgradeToV3Button).toBeVisible({ timeout: 10000 });
    await this.upgradeToV3Button.click();
    await expect(this.exportUpgradeModalContainer).toBeHidden({
      timeout: 10000,
    });
    await takeAndAttachScreenshot(this.page, "export-config-upgraded-to-v3");
  }

  async assertExportSuccessToast(): Promise<void> {
    await expect(this.exportSuccessAlert).toBeVisible({ timeout: 10000 });
    await expect(this.exportSuccessTitle).toContainText(
      /exported specmatic config/i,
    );
    await takeAndAttachScreenshot(this.page, "export-config-success-toast");
  }

  private async clickExportAsConfigButton(): Promise<void> {
    await this.exportAsConfigButton.scrollIntoViewIfNeeded();
    await this.exportAsConfigButton.hover();
    await this.page.waitForTimeout(150);
    await this.exportAsConfigButton.click({ force: true });
    await this.page.waitForTimeout(250);
  }
}
