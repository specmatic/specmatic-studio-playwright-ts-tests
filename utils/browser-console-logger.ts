import { Page, TestInfo, Request } from "@playwright/test";

type LogEntry = {
  type: string;
  message: string;
};

export function captureBrowserConsole(page: Page, testInfo: TestInfo) {
  const logs: LogEntry[] = [];

  // Browser console logs
  page.on("console", (msg) => {
    logs.push({
      type: msg.type().toUpperCase(),
      message: msg.text(),
    });
  });

  // Uncaught JS errors
  page.on("pageerror", (error) => {
    logs.push({
      type: "PAGEERROR",
      message: error.message,
    });
  });

  // Network failures
  page.on("requestfailed", (request: Request) => {
    logs.push({
      type: "REQUESTFAILED",
      message: `${request.method()} ${request.url()} → ${request.failure()?.errorText}`,
    });
  });

  return {
    attach: async () => {
      if (logs.length === 0) return;

      const content = logs.map((l) => `[${l.type}] ${l.message}`).join("\n");

      await testInfo.attach("browser-and-network.log", {
        body: Buffer.from(content),
        contentType: "text/plain",
      });
    },
  };
}
