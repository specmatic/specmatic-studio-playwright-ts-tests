const { execSync } = require("child_process");

module.exports = async () => {
  const envName = process.env.ENV_NAME || (process.env.CI ? "ci" : "local");
  if (process.env.USE_DOCKER === "true") {
    try {
      console.log(`[teardown] Stopping docker containers with stop-docker.sh (USE_DOCKER=true)`);
      execSync("./stop-docker.sh", { stdio: "inherit" });
    } catch (e) {
      console.error("[teardown] Failed to stop docker:", e);
    }
  }
};
