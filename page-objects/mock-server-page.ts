import { Locator, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";

export class MockServerPage extends BasePage {
  readonly specTree: Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    super(page, testInfo, eyes);
    this.specTree = page.locator("#spec-tree");
  }

  async selectSpec(specName: string) {
    await expect(this.specTree).toBeVisible({ timeout: 4000 });
    const specLocator = this.specTree.locator("text=" + specName);
    await expect(specLocator).toBeVisible({ timeout: 4000 });
    await specLocator.click({ force: true });
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "selected-spec-screenshot");
    }
    return specLocator;
  }

  async clickRunMockServer() {
    const mockBtn = this.page.getByText(/Run mock server/i);
    await mockBtn.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "clicked-run-mock-screenshot",
      this.eyes,
    );
    return mockBtn;
  }
}
