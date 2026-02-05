import { Page, test } from "@playwright/test";

/**
 * Takes a screenshot and attaches it to the Playwright report for the current test.
 * @param page Playwright Page object
 * @param attachmentName Name for the report attachment
 */
export async function takeAndAttachScreenshot(
  page: Page,
  attachmentName: string,
): Promise<void> {
  const screenshotBuffer = await page.screenshot({
    type: "png",
    animations: "disabled",
  });
  test.info().attach(attachmentName, {
    body: screenshotBuffer,
    contentType: "image/png",
  });
}
