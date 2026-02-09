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
  // Wait for network to be idle and page to be stable
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500); // Optional: small delay for visual stability

  const screenshotBuffer = await page.screenshot({
    type: "png",
    animations: "disabled",
  });
  test.info().attach(attachmentName, {
    body: screenshotBuffer,
    contentType: "image/png",
  });

  // Applitools Eyes integration: check for eyes param or page.eyes
  const eyesInstance = eyes || (page as any).eyes;
  if (eyesInstance) {
    try {
      await eyesInstance.check(attachmentName, Target.window().fully(true));
    } catch (e) {
      // Optionally log error
    }
  }
}
