import {
  BatchInfo,
  EyesRunner,
  VisualGridRunner,
} from "@applitools/eyes-playwright";

export const ENABLE_VISUAL = process.env.ENABLE_VISUAL === "true";
export const Runner: EyesRunner = new VisualGridRunner({ testConcurrency: 5 });
export const Batch: BatchInfo = new BatchInfo({
  name: `Specmatic Studio Playwright Tests - ${process.env.ENV_NAME || "local"}`,
});
Batch.setNotifyOnCompletion(true);
if (process.env.BATCH_SEQUENCE_NAME) {
  Batch.setSequenceName(process.env.BATCH_SEQUENCE_NAME);
}
if (process.env.BATCH_ID) Batch.setId(process.env.BATCH_ID);
{
  Batch.addProperty("environment", process.env.ENV_NAME || "local");
}
export default async function globalSetup() {
  // No-op: Applitools batch/runner setup is handled in worker context for each test process.
}
