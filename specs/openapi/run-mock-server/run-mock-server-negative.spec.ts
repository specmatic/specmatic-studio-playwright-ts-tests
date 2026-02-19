import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../../specNames";
import { MockServerPage } from "../../../page-objects/mock-server-page";

test.describe("Mock Server - Negative Scenarios", () => {
  let mockPage: MockServerPage;

  test.beforeEach(async ({ page, eyes }, testInfo) => {
    mockPage = new MockServerPage(
      page,
      testInfo,
      eyes,
      PRODUCT_SEARCH_BFF_SPEC,
    );
    await mockPage.openRunMockServerTab();
  });

  test(
    "Should show error when starting mock on an already used port",
    { tag: ["@apiMocking", "@usedPort"] },
    async () => {
      const usedPort = 9000;

      await test.step(`Attempt to start mock on used port: ${usedPort}`, async () => {
        await mockPage.fillMockPort(usedPort);
        await mockPage.startMockServer();
      });

      await test.step("Verify 'Port in use' error message", async () => {
        const error = await mockPage.getErrorMessage();

        expect(error.title).toBe("Failed to start mock");
        expect(error.detail).toContain(`Port ${usedPort} is already in use`);

        const isRunning = await mockPage.isMockServerRunning();
        expect(isRunning, "Mock server should not be in running state").toBe(
          false,
        );

        await mockPage.dismissAlert();
      });
    },
  );

  test(
    "Should show error when entering an invalid port number",
    { tag: ["@apiMocking", "@invalidPort"] },
    async () => {
      const invalidPort = 99999;

      await test.step(`Attempt to start mock on invalid port: ${invalidPort}`, async () => {
        await mockPage.fillMockPort(invalidPort);
        await mockPage.startMockServer();
      });

      await test.step("Verify invalid port error message", async () => {
        const error = await mockPage.getErrorMessage();

        expect.soft(error.title).toBe("Failed to start mock");
        expect.soft(error.detail).toMatch(/invalid port|out of range/i);

        const isRunning = await mockPage.isMockServerRunning();
        expect(isRunning).toBe(false);

        await mockPage.dismissAlert();
      });
    },
  );
});
