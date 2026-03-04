import { test } from "../../utils/eyesFixture";
import { PROXY_URL, PROXY_PORT, PROXY_RECORDINGS_SPEC } from "../specNames";
import { SpecmaticStudioPage } from "../../page-objects/specmatic-studio-page";
import { MockServerPage } from "../../page-objects/mock-server-page";
import { ProxyPage } from "../../page-objects/jio-proxy-page";

const CAPTURED_PATH =
  "/api/jio-recharge-service/recharge/mobility/number/{param}";
const MOBILE_NUMBER = "8556663339";

test.describe("API Specification Management", () => {
  test(
    "Record New API Specification via Proxy",
    { tag: ["@proxy", "@recordNewAPISpec", "@recordNewSpec", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const studio = new SpecmaticStudioPage(page, testInfo, eyes);
      const mockPage = new MockServerPage(page, testInfo, eyes, PROXY_RECORDINGS_SPEC);
      

      await test.step("Setup proxy recording", async () => {
        await studio.gotoHomeAndOpenSidebar();
        await studio.clickRecordSpec();
        await studio.fillTargetUrl(PROXY_URL);
        await studio.fillProxyPort(PROXY_PORT);
        await studio.handleProxyErrorDialog();
        await studio.clickStartProxy();
      });

      const proxyUrl = await test.step("Assert proxy started and get URL",
        async () => studio.assertProxyStartedAndGetUrl());

      const proxyTab = await test.step("Open proxy target in new tab",
        async () => studio.openProxyUrlInNewTab(proxyUrl));
        const jioPage = new ProxyPage(proxyTab, testInfo, eyes);

      await test.step(`Capture API call: enter mobile '${MOBILE_NUMBER}' and verify in proxy table`, async () => {
        await page.bringToFront();
        await studio.assertProxyTableVisible();
        await jioPage.bringToFront();
        await jioPage.enterMobileNumberAndProceed(MOBILE_NUMBER);
        await page.bringToFront();
        await studio.assertProxyTableRowByPath(CAPTURED_PATH, 1);
      });

      await test.step("Start mock replay and verify in right sidebar", async () => {
        await studio.clickReplayForPath(CAPTURED_PATH);
        await studio.assertRightSidebarMockStarted(PROXY_RECORDINGS_SPEC);
      });

      await test.step(`Replay via mock: second API call and verify in mock tab`, async () => {
        await jioPage.bringToFront();
        await jioPage.enterMobileNumberAndProceed(MOBILE_NUMBER, "2");
        await page.bringToFront();
        await studio.gotoHomeAndOpenSidebar();
        await studio.sideBar.selectSpec(PROXY_RECORDINGS_SPEC);
        await mockPage.goBackToMockServerTab();
        await mockPage.assertMockPathVisible(CAPTURED_PATH);
      });

      await test.step("View drill-down details for intercepted API result", async () => {
        await mockPage.clickMockTableRemark(CAPTURED_PATH, "400");
        await mockPage.getDrillDownState(0);
      });
    },
  );

  test(
    "Record New Spec",
    { tag: ["@proxy", "@recordNewSpec", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const specPage = new SpecmaticStudioPage(page, testInfo, eyes);
      await specPage.gotoHomeAndOpenSidebar();
      await test.step("Record Spec", async () => specPage.clickRecordSpec());
    },
  );
});
