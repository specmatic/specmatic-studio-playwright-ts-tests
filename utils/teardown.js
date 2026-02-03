const { execSync } = require("child_process");

module.exports = async () => {
  const envName = process.env.ENV_NAME || (process.env.CI ? "ci" : "local");
  if (process.env.USE_DOCKER === "true") {
    const isWindows = process.platform === "win32";
    const path = require("path");
    const rootDir = path.resolve(__dirname, "..");
    const dockerScript = isWindows
      ? path.join(rootDir, "stop-docker.bat")
      : path.join(rootDir, "stop-docker.sh");
    // Wrap the script path in quotes to handle spaces
    const quotedScript = `"${dockerScript}"`;
    try {
      console.log(
        `[teardown] Stopping docker containers with ${quotedScript} (USE_DOCKER=true)`,
      );
      execSync(quotedScript, { stdio: "inherit" });
    } catch (e) {
      console.error("[teardown] Failed to stop docker:", e);
    }
  }
};
