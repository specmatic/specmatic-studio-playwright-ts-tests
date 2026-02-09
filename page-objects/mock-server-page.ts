import { Locator, type TestInfo, Page } from "@playwright/test";
import { BasePage } from "./base-page";

export class MockServerPage extends BasePage {
  readonly specTree: Locator;
  readonly runMockServerTab: Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    super(page, testInfo, eyes);
    this.specTree = page.locator("#spec-tree");
    this.runMockServerTab = page.getByText(/Run mock server/i);
  }
}
