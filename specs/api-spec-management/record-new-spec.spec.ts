import { test, expect } from "../../utils/eyesFixture";
import { takeAndAttachScreenshot } from "../../utils/screenshotUtils";
import { ORDER_API_URL, PROXY_PORT } from "../specNames";
import { SpecmaticStudioPage } from "../../page-objects/specmatic-studio-page";
test.describe("API Specification Management", () => {
  test(
    "Record New API Specification via Proxy",
    { tag: ["@apiSpecManagement", "@recordNewAPISpec", "@recordNewSpec"] },
    async ({ page, eyes }, testInfo) => {
      const studio = new SpecmaticStudioPage(page, testInfo, eyes);

      await test.step(`Go to Proxy's Record Spec`, async () => {
        await studio.goto();
        await studio.clickRecordSpec();
      });

      await test.step(`Fill Target URL: '${ORDER_API_URL}' and Proxy Port: '${PROXY_PORT}' and start proxy`, async () => {
        await studio.fillTargetUrl(ORDER_API_URL);
        await studio.fillProxyPort(PROXY_PORT);
        await studio.clickStartProxy();
      });

      await test.step("Handle Proxy Error dialog if it appears", async () => {
        page.once("dialog", async (dialog) => {
          const allowedMessages = ["Proxy Error"];
          const msg = dialog.message();
          expect(allowedMessages).toContain(msg);
          await dialog.accept();
        });
      });
    },
  );

  test(
    "Record New Spec",
    { tag: ["@apiSpecManagement", "@recordNewSpec"] },
    async ({ page, eyes }, testInfo) => {
      const specPage = new SpecmaticStudioPage(page, testInfo, eyes);

      await specPage.gotoHomeAndOpenSidebar();
      await test.step("Record Spec", async () => {
        await specPage.clickRecordSpec();
      });
    },
  );
});
