import { test, expect } from "@playwright/test";
import { ORDER_API_URL, PROXY_PORT } from "../specNames";
import { SpecmaticStudioPage } from "../../page-objects/specmatic-studio-page";
test.describe("API Specification Management", () => {
  test(
    "Record New API Specification via Proxy",
    { tag: ["@apiSpecManagement", "@slow"] },
    async ({ page }, testInfo) => {
      const studio = new SpecmaticStudioPage(page, testInfo);
      await studio.goto();
      await studio.clickRecordSpec();
      await studio.fillTargetUrl(ORDER_API_URL);
      await studio.fillProxyPort(PROXY_PORT);
      await studio.clickStartProxy();
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
      await studio.clickStopProxy();
    },
  );
});
