const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const https = require("https");
const net = require("net");
const os = require("os");
const path = require("path");

const TMP_DIR = path.join(process.cwd(), "temp");
const STATE_FILE = path.join(TMP_DIR, "specmatic-studio-state.json");
const REPORTS_DIR = path.join(process.cwd(), "playwright-report");
const STARTUP_TIMEOUT_MS = Number.parseInt(
  process.env.SPECMATIC_STUDIO_STARTUP_TIMEOUT_MS || "120000",
  10,
);
const STUDIO_PORT = 9000;

function ensureTmpDir() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function getLogPath() {
  ensureReportsDir();
  return path.join(REPORTS_DIR, "specmatic.log");
}

function getJarUrl() {
  return process.env.SPECMATIC_STUDIO_JAR_URL?.trim() || "";
}

function isJarModeEnabled() {
  return getJarUrl().length > 0;
}

function getDownloadUrl() {
  const jarUrl = getJarUrl();
  if (!jarUrl) {
    throw new Error(
      "SPECMATIC_STUDIO_JAR_URL is required when jar mode is enabled.",
    );
  }

  try {
    return new URL(jarUrl);
  } catch (error) {
    throw new Error(
      `SPECMATIC_STUDIO_JAR_URL must be a valid URL. Received: ${jarUrl}`,
    );
  }
}

function getJarFileName(downloadUrl) {
  const pathname = downloadUrl.pathname || "";
  const decodedPath = decodeURIComponent(pathname);
  const fileName = path.basename(decodedPath);
  if (!fileName || !fileName.endsWith(".jar")) {
    throw new Error(
      `Could not derive a .jar file name from URL: ${downloadUrl.toString()}`,
    );
  }
  return fileName;
}

function getJarPath(downloadUrl) {
  return path.join(TMP_DIR, getJarFileName(downloadUrl));
}

function shouldOverwriteDownloadedJar() {
  return process.env.SPECMATIC_STUDIO_JAR_OVERWRITE === "true";
}

function downloadToFile(downloadUrl, destinationPath) {
  const client = downloadUrl.protocol === "https:" ? https : http;
  const tempPath = `${destinationPath}.download`;

  return new Promise((resolve, reject) => {
    const request = client.get(downloadUrl, (response) => {
      const statusCode = response.statusCode ?? 0;

      if (
        statusCode >= 300 &&
        statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        const redirectUrl = new URL(response.headers.location, downloadUrl);
        downloadToFile(redirectUrl, destinationPath).then(resolve, reject);
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(
          new Error(
            `Failed to download ${downloadUrl.toString()}. HTTP ${statusCode}`,
          ),
        );
        return;
      }

      const fileStream = fs.createWriteStream(tempPath);
      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close(() => {
          fs.renameSync(tempPath, destinationPath);
          resolve();
        });
      });

      fileStream.on("error", (error) => {
        response.destroy(error);
      });
    });

    request.on("error", (error) => {
      fs.rmSync(tempPath, { force: true });
      reject(error);
    });
  });
}

async function ensureJarDownloaded() {
  ensureTmpDir();
  const downloadUrl = getDownloadUrl();
  const jarPath = getJarPath(downloadUrl);

  if (fs.existsSync(jarPath) && !shouldOverwriteDownloadedJar()) {
    console.log(`[specmatic] Reusing cached jar: ${jarPath}`);
    return { jarPath, sourceUrl: downloadUrl.toString() };
  }

  console.log(`[specmatic] Downloading jar from ${downloadUrl.toString()}`);
  await downloadToFile(downloadUrl, jarPath);
  console.log(`[specmatic] Saved jar to ${jarPath}`);

  return { jarPath, sourceUrl: downloadUrl.toString() };
}

function ensureJavaInstalled() {
  const result = spawnSync("java", ["-version"], {
    stdio: "ignore",
  });

  if (result.error) {
    throw new Error(
      "Specmatic Studio jar mode requires Java, but `java` was not found on PATH. Install Java and make sure the `java` command is available.",
    );
  }

  if (result.status !== 0) {
    throw new Error(
      `Specmatic Studio jar mode requires a working Java runtime. \`java -version\` exited with code ${result.status}.`,
    );
  }
}

function ensurePortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${port} is already in use. Stop the process using port ${port} or disable jar mode before running the tests.`,
          ),
        );
        return;
      }
      reject(error);
    });
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });
}

async function waitForStudio(baseURL, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const request = http.get(baseURL, (response) => {
          response.resume();
          if ((response.statusCode ?? 500) < 500) {
            resolve();
          } else {
            reject(
              new Error(`Studio returned HTTP ${response.statusCode ?? "?"}`),
            );
          }
        });

        request.setTimeout(2000, () => {
          request.destroy(new Error("Timed out waiting for Studio."));
        });
        request.on("error", reject);
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(
    `Specmatic Studio did not become ready within ${timeoutMs}ms at ${baseURL}.`,
  );
}

function writeState(state) {
  ensureTmpDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getStudioState() {
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function removeStateFile() {
  fs.rmSync(STATE_FILE, { force: true });
}

function killPid(pid) {
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
    if (result.status !== 0) {
      throw new Error(`taskkill failed for PID ${pid}`);
    }
    return;
  }

  process.kill(pid, "SIGTERM");
}

async function ensureSpecmaticStudioForRun() {
  if (!isJarModeEnabled()) {
    return null;
  }

  const existingState = getStudioState();
  if (existingState) {
    console.log(
      `[specmatic] Cleaning up stale Studio process before starting a new one (PID ${existingState.pid}).`,
    );
    await stopSpecmaticStudioForRun();
  }

  ensureJavaInstalled();
  const { jarPath, sourceUrl } = await ensureJarDownloaded();
  const port = STUDIO_PORT;
  await ensurePortAvailable(port);
  const baseURL = `http://127.0.0.1:${port}/_specmatic/studio`;
  const logPath = getLogPath();
  const logFd = fs.openSync(logPath, "w");
  const child = spawn(
    "java",
    ["-jar", jarPath, "studio", "--port", String(port)],
    {
      detached: true,
      stdio: ["ignore", logFd, logFd],
    },
  );
  fs.closeSync(logFd);
  child.unref();

  const pid = child.pid;
  if (!pid) {
    throw new Error("Failed to start Specmatic Studio jar process.");
  }

  writeState({
    mode: "jar",
    pid,
    port,
    baseURL,
    jarPath,
    sourceUrl,
    logPath,
  });

  try {
    console.log(`[specmatic] Waiting for Studio at ${baseURL}`);
    await waitForStudio(baseURL, STARTUP_TIMEOUT_MS);
    console.log(`[specmatic] Studio is ready on port ${port}`);
    return getStudioState();
  } catch (error) {
    await stopSpecmaticStudioForRun();
    throw error;
  }
}

async function stopSpecmaticStudioForRun() {
  const state = getStudioState();
  if (!state) {
    return;
  }

  try {
    killPid(state.pid);
    console.log(`[specmatic] Stopped Studio process PID ${state.pid}`);
  } catch (error) {
    if (error?.code !== "ESRCH") {
      console.warn(
        `[specmatic] Failed to stop Studio process PID ${state.pid}:`,
        error,
      );
    }
  } finally {
    removeStateFile();
  }
}

function setupSpecmaticStudioForRunSync() {
  const result = spawnSync(process.execPath, [__filename, "setup"], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(
      `Failed to prepare Specmatic Studio jar runtime (exit code ${result.status ?? "unknown"}).`,
    );
  }

  return getStudioState();
}

async function runCli() {
  const command = process.argv[2];

  if (command === "setup") {
    await ensureSpecmaticStudioForRun();
    return;
  }

  if (command === "teardown") {
    await stopSpecmaticStudioForRun();
    return;
  }

  console.error(`Unknown command: ${command || "<none>"}`);
  process.exitCode = 1;
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  ensureSpecmaticStudioForRun,
  getStudioState,
  isJarModeEnabled,
  setupSpecmaticStudioForRunSync,
  stopSpecmaticStudioForRun,
};
