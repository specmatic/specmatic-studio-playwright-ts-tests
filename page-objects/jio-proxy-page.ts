import { Locator, type TestInfo, Page } from "@playwright/test";
import { BasePage } from "./base-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class JioAppInProxyPage extends BasePage {
  private readonly mobileInput: Locator;
  private readonly proceedBtn: Locator;
  private readonly noPlansMessage: Locator;

  constructor(page: Page, testInfo: TestInfo, eyes?: any) {
    super(page, testInfo, eyes);
    this.mobileInput = page.locator(
      'input[data-testid="JDSInput-input"][name="mobileNumber"]',
    );
    this.proceedBtn = page
      .locator('[data-testid="JDSActionButton-jds-text"]')
      .filter({ hasText: "Proceed" });
    this.noPlansMessage = page.getByText(
      "We searched far and wide and couldn’t find what you were looking for. Try something else.",
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

  private async enterMobileNumberAndProceedAndWaitForText(
    mobileNumber: string,
    expectedText: string,
  ) {
    await this.mobileInput.scrollIntoViewIfNeeded();
    await this.mobileInput.click();
    await this.page.waitForTimeout(1000);

    await this.mobileInput.fill("");
    await this.mobileInput.fill(mobileNumber);
    await takeAndAttachScreenshot(this.page, `mobile-number-entered`);

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
    await takeAndAttachScreenshot(this.page, `proceed-clicked`);
  }

  async enterMobileNumberAndProceed(mobileNumber: string) {
    await this.enterMobileNumberAndProceedAndWaitForText(
      mobileNumber,
      "Top Trending True 5G Unlimited Plans",
    );
  }

  async enterMobileNumberAndProceedExpectingNoPlans(mobileNumber: string) {
    await this.enterMobileNumberAndProceedAndWaitForText(
      mobileNumber,
      "We searched far and wide and couldn’t find what you were looking for. Try something else.",
    );
  }

  async assertPlansPageVisible(): Promise<void> {
    const plansContainer = this.page.locator(
      '[data-testid="desktopChangeCategory"]',
    );
    await plansContainer.waitFor({ state: "visible", timeout: 15000 });
    await takeAndAttachScreenshot(this.page, "plans-page-visible");
  }

  async assertNoPlansMessageVisible(): Promise<void> {
    await this.noPlansMessage.waitFor({ state: "visible", timeout: 15000 });
    await takeAndAttachScreenshot(this.page, "plans-empty-state-visible");
  }
}
