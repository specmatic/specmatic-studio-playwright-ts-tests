import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../../specNames";
import { MockServerPage } from "../../../page-objects/mock-server-page";
import { ApiContractPage } from "../../../page-objects/api-contract-page";
import { validateMockSummaryAndTableCounts } from "./run-mock-server.helper";

test.describe("API Mocking", () => {
  test(
    "Run Mock Server for API Spec",
    { tag: ["@apiMocking"] },
    async ({ page, eyes }, testInfo) => {
      test.setTimeout(120000);
      const mockPage = new MockServerPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC,
      );

      let mockUrl: string;

      await test.step(`Go to Mock page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC}'`, async () => {
        await mockPage.openRunMockServerTab();
      });
      await test.step("Start Mock Server", async () => {
        await mockPage.fillMockPort(9999);
        await mockPage.startMockServer();
        mockUrl = await mockPage.getMockURL();
      });

      await test.step("Navigate to Contract Tests tab and Update Service URL", async () => {
        await mockPage.clickContractTests();
        await mockPage.enterServiceBaseURL(mockUrl);
      });

      await test.step("Run Contract Tests and Validate Mock Server Results", async () => {
        const contractPage = new ApiContractPage(
          page,
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC,
        );
        await contractPage.clickRunContractTests();

        await test.step("Navigate back to Mock Server tab", async () => {
          await mockPage.clickMockServerTab();
        });

        await test.step("Validate Mock Summary Results", async () => {
          await validateMockSummaryAndTableCounts(mockPage, {
            success: 45,
            failed: 2,
            total: 47,
            error: 0,
            notcovered: 0,
          });
        });

        await test.step("Validate Mock Table Headers", async () => {
          const headers = await mockPage.getMockTableHeadersData();

          expect(headers.coverage.text).toBe("Coverage");
          expect(headers.coverage.total).toBe("54%");

          expect(headers.path).toMatchObject({
            text: "Path",
            total: "6",
            enabled: "6",
            disabled: "0",
          });
          expect(headers.method).toMatchObject({
            text: "Method",
            total: "6",
            enabled: "6",
            disabled: "0",
          });

          // Validate Response
          expect(headers.response).toMatchObject({
            text: "Response",
            total: "13",
            enabled: "13",
            disabled: "0",
          });
        });

        await test.step("Verify Drill-Down Scenarios", async () => {
          await mockPage.clickMockTableRemark("/products", "201");

          const count = await mockPage.getTotalDrillDownCount();
          expect(count, "The number of drill-down scenarios should be 12").toBe(
            12,
          );

          const isAllSuccess = await mockPage.areAllDrillDownsSuccess();
          expect(
            isAllSuccess,
            "Expected all drill-down scenarios to have 'Success' status",
          ).toBe(true);

          const indicesToCheck = count > 1 ? [0, count - 1] : [0];

          for (const index of indicesToCheck) {
            const label = index === 0 ? "First" : "Last";

            await test.step(`Verify structure of ${label} drill-down`, async () => {
              const state = await mockPage.getDrillDownState(index);

              expect(
                state.requestVisible,
                `${label} drill-down request block should be visible`,
              ).toBe(true);
              expect(
                state.responseVisible,
                `${label} drill-down response block should be visible`,
              ).toBe(true);
            });
          }

          await mockPage.goBackFromDrillDown();
        });

        await test.step("Verify Mock Filter Operations", async () => {
          await test.step("Filter by Success and verify count matches", async () => {
            const { headerCount, filteredCount } =
              await mockPage.verifyMockFilterCountMatches("success");

            expect(
              filteredCount,
              `Expected table sum to match header count of ${headerCount}`,
            ).toBe(headerCount);
          });

          await test.step("Filter by Failed and verify count matches", async () => {
            const { headerCount, filteredCount } =
              await mockPage.verifyMockFilterCountMatches("failed");
            expect(
              filteredCount,
              `Expected table sum to match header count of ${headerCount}`,
            ).toBe(headerCount);
          });

          await test.step("Reset to Total filter and verify all results", async () => {
            await mockPage.clickMockFilterHeader("total");
            const { headerCount, filteredCount } =
              await mockPage.verifyMockFilterCountMatches("total");
            expect(
              filteredCount,
              `Expected table sum to match header count of ${headerCount}`,
            ).toBe(headerCount);
          });
        });
      });
    },
  );
});
