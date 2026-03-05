import { Locator, type TestInfo, Page } from "@playwright/test";
import { BasePage } from "./base-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class JioAppInProxyPage extends BasePage {
  private readonly mobileInput: Locator;
  private readonly proceedBtn: Locator;

  constructor(page: Page, testInfo: TestInfo, eyes?: any) {
    super(page, testInfo, eyes);
    this.mobileInput = page.locator('input[data-testid="JDSInput-input"]');
    this.proceedBtn = page
      .locator('[data-testid="JDSActionButton-jds-text"]')
      .filter({ hasText: "Proceed" });
  }

  async bringToFront() {
    await this.page.bringToFront();
  }

  async enterMobileNumberAndProceed(mobileNumber: string) {
    await this.mobileInput.scrollIntoViewIfNeeded();
    await this.mobileInput.click();
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.mobileInput.fill(mobileNumber);
    await takeAndAttachScreenshot(
      this.page,
      `mobile-number-entered`,
    );

    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.url().includes("mobility/number/") &&
          [200, 400].includes(r.status()),
        { timeout: 10000 },
      ),
      this.proceedBtn.click(),
    ]);

    await takeAndAttachScreenshot(this.page, `proceed-clicked`);
  }
}
