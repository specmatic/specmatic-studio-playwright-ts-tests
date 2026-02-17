import { BatchClose } from "@applitools/eyes-playwright";
import { Batch, Runner } from "./global-setup";

export default async function globalTeardown() {
  console.log("Running global teardown...");
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
      await batchClose.close();
    } else {
      console.warn(
        "APPLITOOLS_API_KEY is not set. Skipping Applitools batch close.",
      );
    }
  }
}
