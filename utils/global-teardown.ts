import { Batch, Runner } from "./global-setup";

export default async function globalTeardown() {
  console.log("Running global teardown...");
  if (Runner) {
    console.log("Fetching Applitools batch results for all tests...");
    const results = await Runner.getAllTestResults();
    console.log("Applitools batch results:", results);
  }
  if (Batch) {
    console.log(`Batch Name: ${Batch.getName().toString()}`);
    console.log(`Batch ID: ${Batch.getId()}`);
    console.log(`Batch Sequence Name: ${Batch.getSequenceName()}`);
    console.log(`Batch Properties: ${JSON.stringify(Batch.getProperties())}`);
  }
}
