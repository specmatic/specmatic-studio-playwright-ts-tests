import { Locator, type TestInfo, Page } from "@playwright/test";
import { BasePage } from "./base-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class JioAppInProxyPage extends BasePage {
  private readonly mobileInput: Locator;
  private readonly proceedBtn: Locator;
  private readonly noPlansMessage: Locator;
  private readonly invalidNumberMessage: Locator;

  constructor(page: Page, testInfo: TestInfo, eyes?: any) {
    super(page, testInfo, eyes);
    this.mobileInput = page.locator(
      [
        'input[data-testid="JDSInput-input"][name="mobileNumber"]',
        'input[name="mobileNumber"]:not([type="hidden"])',
        'input[placeholder="Jio Number"]:not([type="hidden"])',
        'input[placeholder*="Jio Number"]:not([type="hidden"])',
      ].join(", "),
    );
    this.proceedBtn = page
      .locator('[data-testid="JDSActionButton-jds-text"]')
      .filter({ hasText: "Proceed" });
    this.noPlansMessage = page.getByText(
      "We searched far and wide and couldn’t find what you were looking for. Try something else.",
    );
    this.invalidNumberMessage = page.getByText(
      "It seems you have entered a non-Jio number. Please try again with a Jio number",
    );
  }

  async bringToFront() {
    await this.page.bringToFront();
  }

  async goto(url: string) {
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
  }

  async reload() {
    await this.page.reload({ waitUntil: "domcontentloaded" });
  }

  async close() {
    await this.page.close();
  }

  private async enterMobileNumberAndProceedAndWaitForText(
    mobileNumber: string,
    expectedText: string,
    withVisualValidation = false,
  ) {
    await this.page
      .getByText("Recharge or pay bills", { exact: false })
      .waitFor({ state: "visible", timeout: 15000 });
    await this.mobileInput.waitFor({ state: "visible", timeout: 15000 });
    await this.mobileInput.scrollIntoViewIfNeeded();
    await this.mobileInput.click();
    await this.page.waitForTimeout(1000);

    await this.mobileInput.fill("");
    await this.mobileInput.fill(mobileNumber);
    await takeAndAttachScreenshot(
      this.page,
      `mobile-number-entered`,
      withVisualValidation ? this.eyes : undefined,
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

    await this.page.getByText(expectedText).waitFor({
      state: "visible",
      timeout: 15000,
    });
    await takeAndAttachScreenshot(
      this.page,
      `proceed-clicked`,
      withVisualValidation ? this.eyes : undefined,
    );
  }

  async enterMobileNumberAndProceed(
    mobileNumber: string,
    withVisualValidation = false,
  ) {
    await this.enterMobileNumberAndProceedAndWaitForText(
      mobileNumber,
      "Top Trending True 5G Unlimited Plans",
      withVisualValidation,
    );
  }

  async enterMobileNumberAndProceedExpectingNoPlans(mobileNumber: string) {
    await this.enterMobileNumberAndProceedAndWaitForText(
      mobileNumber,
      "We searched far and wide and couldn’t find what you were looking for. Try something else.",
    );
  }

  async enterMobileNumberAndProceedExpectingInvalidNumber(
    mobileNumber: string,
    withVisualValidation = false,
  ) {
    await this.enterMobileNumberAndProceedAndWaitForText(
      mobileNumber,
      "It seems you have entered a non-Jio number. Please try again with a Jio number",
      withVisualValidation,
    );
  }

  async assertPlansPageVisible(withVisualValidation = false): Promise<void> {
    const plansContainer = this.page.locator(
      '[data-testid="desktopChangeCategory"]',
    );
    await plansContainer.waitFor({ state: "visible", timeout: 15000 });
    await takeAndAttachScreenshot(
      this.page,
      "plans-page-visible",
      withVisualValidation ? this.eyes : undefined,
    );
  }

  async assertNoPlansMessageVisible(): Promise<void> {
    await this.noPlansMessage.waitFor({ state: "visible", timeout: 15000 });
    await takeAndAttachScreenshot(this.page, "plans-empty-state-visible");
  }

  async assertInvalidNumberMessageVisible(
    withVisualValidation = false,
  ): Promise<void> {
    await this.invalidNumberMessage.waitFor({ state: "visible", timeout: 15000 });
    await takeAndAttachScreenshot(
      this.page,
      "invalid-number-message-visible",
      withVisualValidation ? this.eyes : undefined,
    );
  }
}
