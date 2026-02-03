import { expect, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "./screenshotUtils";

export async function assertVisible(
  page: Page,
  locatorOrElement: any,
  name?: string,
  testInfo?: any,
) {
  await expect(locatorOrElement).toBeVisible();
  if (name && testInfo) {
    await takeAndAttachScreenshot(page, name, testInfo.title);
  }
}

export async function assertText(
  page: Page,
  text: string,
  name?: string,
  testInfo?: any,
) {
  await expect(page.getByText(text)).toBeVisible();
  if (name && testInfo) {
    await takeAndAttachScreenshot(page, name, testInfo.title);
  }
}
