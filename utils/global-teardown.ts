import { BatchClose } from "@applitools/eyes-playwright";
import { Batch, Runner } from "./global-setup";
const studioRuntime = require("./specmatic-studio-runtime");
const { stopSpecmaticStudioForRun } = studioRuntime;

export default async function globalTeardown() {
  console.log("Running global teardown...");
  try {
    if (Runner) {
      console.log("Fetching Applitools batch results for all tests...");
      const results = await Runner.getAllTestResults();
      console.log("Applitools batch results:", results);
    }
    if (Batch && process.env.ENABLE_VISUAL === "true") {
      console.log(`Batch Name: ${Batch.getName().toString()}`);
      console.log(`Batch ID: ${Batch.getId()}`);
      console.log(`Batch Sequence Name: ${Batch.getSequenceName()}`);
      console.log(`Batch Properties: ${JSON.stringify(Batch.getProperties())}`);
      // Applitools BatchClose requires batchIds, serverUrl, and apiKey
      const batchId = Batch.getId();
      const serverUrl =
        process.env.APPLITOOLS_SERVER_URL || "https://eyes.applitools.com";
      const apiKey = process.env.APPLITOOLS_API_KEY;
      console.log(
        `Closing Applitools batch with ID: ${batchId}, Server URL: ${serverUrl} and API Key: ${apiKey}`,
      );
      if (apiKey) {
        const batchClose = new BatchClose({
          batchIds: [batchId],
          serverUrl,
          apiKey,
        });
        try {
          await batchClose.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const isNotFoundError =
            errorMessage.includes("Not Found(404)") ||
            errorMessage.includes("status Not Found(404)") ||
            errorMessage.includes("404");

          if (isNotFoundError) {
            console.warn(
              "Applitools batch close returned 404. This can happen when Eyes sessions were already aborted or finalized after a failed test. Continuing teardown.",
            );
          } else {
            throw error;
          }
        }
      } else {
        console.warn(
          "APPLITOOLS_API_KEY is not set. Skipping Applitools batch close.",
        );
      }
    }
  } finally {
    await stopSpecmaticStudioForRun();
  }
}
