import { Page } from "@playwright/test";

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async clickButtonByText(text: string) {
    const btn = this.page.getByText(new RegExp(text, "i"));
    await btn.click({ force: true });
    return btn;
  }

  async fillInputByPlaceholder(placeholder: string, value: string) {
    const input = this.page.getByPlaceholder(placeholder);
    await input.fill(value);
    return input;
  }

  async fillInputByRole(role: string, value: string) {
    const input = this.page.getByRole(role as any);
    await input.fill(value);
    return input;
  }
}
