import { expect, type Locator, type Page } from "@playwright/test";

export class SpecificationRenamePage {
  constructor(private readonly page: Page) {}

  async rename(specName: string, newBaseName: string): Promise<void> {
    const section = this.specSection(specName);
    const renameControl = section.locator("inline-filename-rename[data-specification-rename-path]");

    await expect(renameControl).toBeVisible({ timeout: 10000 });
    await renameControl.locator(".ifr__action").click();

    const basename = renameControl.locator(".ifr__input--basename");
    await expect(basename).toBeVisible({ timeout: 5000 });
    await basename.fill(newBaseName);
    await basename.press("Enter");
  }

  async confirmConfigUpdate(configPath: string): Promise<void> {
    const dialog = this.page.locator("specification-rename-dialog[open]");
    const dialogPanel = dialog.locator(".specification-rename-dialog");
    await expect(dialogPanel).toBeVisible({ timeout: 10000 });
    await expect(dialog).toContainText("Configuration");
    await expect(dialog).toContainText(configPath);
    await dialog.locator('[data-action="confirm"]').click();
    await expect(dialog).toBeHidden({ timeout: 30000 });
  }

  private specSection(specName: string): Locator {
    return this.page
      .locator(".screen")
      .filter({
        has: this.page.locator(`.info span[data-path]:has-text("File path: ./${specName}")`),
      })
      .first();
  }
}
