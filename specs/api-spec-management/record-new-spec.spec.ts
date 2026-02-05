// tags: ['@apiSpecManagement', '@slow']
// suite: API Specification Management
// scenario: Record New API Specification via Proxy

import { test, expect } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { ORDER_API_URL, PROXY_PORT } from "../specNames";

test.describe("API Specification Management", () => {
  test("Record New API Specification via Proxy", async ({ page }, testInfo) => {
    await page.goto("/");
    await takeAndAttachScreenshot(
      page,
      "app-loaded",
      testInfo.title,
      "app-loaded-screenshot",
    );

    // Click 'Record Record a specification' button
    const recordBtn = page.getByRole("button", {
      name: /Record a specification/i,
    });
    await recordBtn.click({ force: true });
    await takeAndAttachScreenshot(
      page,
      "clicked-record-spec",
      testInfo.title,
      "clicked-record-spec-screenshot",
    );

    // Fill Target Service URL
    const targetUrlInput = page.getByPlaceholder(
      "e.g. https://example.com:3000",
    );
    await targetUrlInput.fill(ORDER_API_URL);
    await takeAndAttachScreenshot(
      page,
      "filled-target-url",
      testInfo.title,
      "filled-target-url-screenshot",
    );

    // Fill Proxy Port
    const proxyPortInput = page.getByRole("spinbutton");
    await proxyPortInput.fill(PROXY_PORT);
    await takeAndAttachScreenshot(
      page,
      "filled-proxy-port",
      testInfo.title,
      "filled-proxy-port-screenshot",
    );

    // Click Start
    const startBtn = page.locator("#startProxy");
    await startBtn.click({ force: true });
    await takeAndAttachScreenshot(
      page,
      "clicked-start",
      testInfo.title,
      "clicked-start-screenshot",
    );

    page.once("dialog", async (dialog) => {
      const allowedMessages = [
        "Proxy started successfully",
        "Proxy is already running",
        "Proxy Error",
      ];
      const msg = dialog.message();
      expect(allowedMessages).toContain(msg);
      await dialog.accept();
    });
    await takeAndAttachScreenshot(
      page,
      "clicked-start",
      testInfo.title,
      "clicked-start-screenshot",
    );

    // Click Stop
    const stopBtn = page.locator("#stopProxy");
    await stopBtn.click({ force: true });
    await takeAndAttachScreenshot(
      page,
      "clicked-start",
      testInfo.title,
      "clicked-start-screenshot",
    );
  });
});
