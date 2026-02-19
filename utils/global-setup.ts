import {
  BatchInfo,
  EyesRunner,
  VisualGridRunner,
} from "@applitools/eyes-playwright";

export const ENABLE_VISUAL = process.env.ENABLE_VISUAL === "true";

// Set BRANCH_NAME for both GitHub Actions and local environments
import { execSync } from "child_process";
import os from "os";
if (!process.env.BRANCH_NAME) {
  let branch = "";
  if (process.env.GITHUB_REF_NAME) {
    branch = process.env.GITHUB_REF_NAME;
  } else {
    try {
      // Works on Mac, Linux, and Windows (with Git Bash)
      branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
    } catch (e) {
      branch = "unknown";
    }
  }
  process.env.BRANCH_NAME = branch;
}

// Set OS, USERNAME, and MACHINE_NAME as environment variables
if (!process.env.OS_TYPE) {
  const rawType = os.type();
  let prettyType = rawType;
  if (rawType === "Darwin") {
    prettyType = "Mac OS";
  } else if (rawType === "Windows_NT") {
    prettyType = "Windows";
  } else if (rawType === "Linux") {
    prettyType = "Linux";
  }
  process.env.OS_TYPE = prettyType;
}
if (!process.env.LOGGED_IN_USER) {
  process.env.LOGGED_IN_USER =
    process.env.USER || process.env.USERNAME || os.userInfo().username;
}
if (!process.env.MACHINE_NAME) {
  process.env.MACHINE_NAME = os.hostname();
}
export const Runner: EyesRunner = new VisualGridRunner({ testConcurrency: 5 });
export const Batch: BatchInfo = new BatchInfo({
  name: (() => {
    let base = process.env.GITHUB_WORKFLOW || "Specmatic Studio";
    if (process.env.GROUP_NAME) {
      base += ` - ${process.env.GROUP_NAME}`;
    }

    let batchName = `${base} - ${process.env.ENV_NAME || "local"}`;
    if (process.env.GITHUB_REF_NAME) {
      batchName += ` - ${process.env.GITHUB_REF_NAME}`;
    }
    if (process.env.GITHUB_RUN_NUMBER) {
      batchName += ` - Run #${process.env.GITHUB_RUN_NUMBER}`;
    }
    return batchName;
  })(),
});
Batch.setNotifyOnCompletion(true);

if (process.env.BATCH_ID) {
  Batch.setId(process.env.BATCH_ID);
}
Batch.addProperty("environment", process.env.ENV_NAME || "local");
Batch.addProperty("branch", process.env.BRANCH_NAME);
Batch.addProperty("os", process.env.OS_TYPE);
Batch.addProperty("user", process.env.LOGGED_IN_USER);
Batch.addProperty("machine", process.env.MACHINE_NAME);
if (process.env.GITHUB_RUN_NUMBER) {
  Batch.addProperty("GITHUB_RUN_NUMBER", process.env.GITHUB_RUN_NUMBER);
}
if (process.env.GROUP_NAME) {
  Batch.addProperty("group_name", process.env.GROUP_NAME);
}
export default async function globalSetup() {
  // No-op: Applitools batch/runner setup is handled in worker context for each test process.
}
