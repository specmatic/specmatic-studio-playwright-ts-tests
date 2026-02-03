const { execSync } = require("child_process");

module.exports = async () => {
  const envName = process.env.ENV_NAME || (process.env.CI ? "ci" : "local");
  if (process.env.USE_DOCKER === "true") {
    const isWindows = process.platform === "win32";
    const dockerScript = isWindows ? "stop-docker.bat" : "./stop-docker.sh";
    try {
      console.log(`[teardown] Stopping docker containers with ${dockerScript} (USE_DOCKER=true)`);
      execSync(dockerScript, { stdio: "inherit" });
    } catch (e) {
      console.error("[teardown] Failed to stop docker:", e);
    }
  }
};
