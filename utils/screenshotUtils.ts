import { Page, test } from "@playwright/test";

/**
 * Takes a screenshot and attaches it to the Playwright report for the current test.
 * @param page Playwright Page object
 * @param name Descriptive name for the screenshot (will be sanitized)
 * @param testId Unique identifier for the test (e.g., test title)
 * @param attachmentName Optional name for the report attachment (defaults to screenshot filename)
 * @returns The path to the saved screenshot
 */
export async function takeAndAttachScreenshot(
  page: Page,
  name?: string,
  testId?: string,
  attachmentName?: string,
): Promise<void> {
  const screenshotBuffer = await page.screenshot({ type: "png" });
  test.info().attach(attachmentName || "Screenshot", {
    body: screenshotBuffer,
    contentType: "image/png",
  });
}

