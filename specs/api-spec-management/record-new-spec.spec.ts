// tags: ['@apiSpecManagement', '@slow']
// suite: API Specification Management
// scenario: Record New API Specification via Proxy

import { test, expect } from "@playwright/test";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
// Use Playwright baseURL from config
const TARGET_URL = "https://example.com:3000";
const PROXY_PORT = "8080";

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
    await targetUrlInput.fill(TARGET_URL);
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
    const startBtn = page.getByRole("button", { name: "Start" });
    await startBtn.click({ force: true });
    await takeAndAttachScreenshot(
      page,
      "clicked-start",
      testInfo.title,
      "clicked-start-screenshot",
    );

    // Expect proxy started message or UI change
    const proxyStatus = page.getByText(/Proxy is started|ready to record/i);
    await expect(proxyStatus).toBeVisible();
    await takeAndAttachScreenshot(
      page,
      "proxy-started",
      testInfo.title,
      "proxy-started-screenshot",
    );
  });
});
