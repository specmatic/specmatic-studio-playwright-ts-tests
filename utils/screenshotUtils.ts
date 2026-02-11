import { Page, test } from "@playwright/test";
import { Target } from "@applitools/eyes-playwright";

/**
 * Takes a screenshot and attaches it to the Playwright report for the current test.
 * If an Eyes instance is available on the page object, also performs a visual check.
 * @param page Playwright Page object
 * @param attachmentName Name for the report attachment
 */
export async function takeAndAttachScreenshot(
  page: Page & { eyes?: any },
  attachmentName: string,
  eyes?: any,
): Promise<void> {
  // Wait for the body to be visible to ensure the page is ready
  try {
    await page.waitForSelector("body", { state: "visible", timeout: 5000 });
  } catch (e) {
    console.error(
      `Timeout waiting for body to be visible before screenshot:`,
      e,
    );
  }

  try {
    const screenshotBuffer = await page.screenshot({
      type: "png",
      animations: "disabled",
    });
    test.info().attach(attachmentName, {
      body: screenshotBuffer,
      contentType: "image/png",
    });
  } catch (e) {
    console.error(`Error taking screenshot:`, e);
  }

  // Applitools Eyes integration: check for eyes param or page.eyes
  const eyesInstance = eyes || (page as any).eyes;
  if (eyesInstance) {
    try {
      await eyesInstance.check(attachmentName, Target.window().fully(true));
    } catch (e) {
      console.error(`Error during Applitools Eyes check:`, e);
    }
  }
}
