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
const ARTIFACT_ID = "executable-all";
const SNAPSHOT_REPO_URL =
  "https://repo.specmatic.io/snapshots/io/specmatic/enterprise/executable-all/";
const RELEASE_REPO_URL =
  "https://repo.specmatic.io/releases/io/specmatic/enterprise/executable-all/";

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

  if (
    jarUrl === "LATEST" ||
    jarUrl === "LATEST_SNAPSHOT" ||
    jarUrl === "LATEST_RELEASE"
  ) {
    return null;
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

function fetchText(url) {
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.get(url, (response) => {
      const statusCode = response.statusCode ?? 0;

      if (
        statusCode >= 300 &&
        statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        const redirectUrl = new URL(response.headers.location, url);
        fetchText(redirectUrl).then(resolve, reject);
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(
          new Error(`Failed to fetch ${url.toString()}. HTTP ${statusCode}`),
        );
        return;
      }

      let data = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        data += chunk;
      });
      response.on("end", () => resolve(data));
    });

    request.on("error", reject);
  });
}

function requestUrl(url, method = "GET") {
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      { method },
      (response) => {
        const statusCode = response.statusCode ?? 0;

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          const redirectUrl = new URL(response.headers.location, url);
          requestUrl(redirectUrl, method).then(resolve, reject);
          return;
        }

        resolve(response);
      },
    );

    request.on("error", reject);
    request.end();
  });
}

async function verifyDirectJarUrl(downloadUrl) {
  if (!["http:", "https:"].includes(downloadUrl.protocol)) {
    throw new Error(
      `SPECMATIC_STUDIO_JAR_URL must use http or https. Received protocol: ${downloadUrl.protocol}`,
    );
  }

  const fileName = getJarFileName(downloadUrl);
  if (!fileName.endsWith(".jar")) {
    throw new Error(
      `SPECMATIC_STUDIO_JAR_URL must point to a .jar file. Received: ${downloadUrl.toString()}`,
    );
  }

  const response = await requestUrl(downloadUrl, "HEAD");
  const statusCode = response.statusCode ?? 0;
  const contentType = String(response.headers["content-type"] || "");
  response.resume();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      `SPECMATIC_STUDIO_JAR_URL is not reachable. HEAD ${downloadUrl.toString()} returned HTTP ${statusCode}.`,
    );
  }

  if (
    contentType &&
    !contentType.includes("application/java-archive") &&
    !contentType.includes("application/octet-stream") &&
    !contentType.includes("binary/octet-stream")
  ) {
    console.warn(
      `[specmatic] Warning: ${downloadUrl.toString()} returned content-type '${contentType}' instead of a typical jar content-type.`,
    );
  }
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

function getXmlTagValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`));
  return match?.[1]?.trim() || null;
}

function getXmlTagValues(xml, tagName) {
  return Array.from(xml.matchAll(new RegExp(`<${tagName}>([^<]+)</${tagName}>`, "g"))).map(
    (match) => match[1].trim(),
  );
}

function parseSnapshotJarVersion(snapshotMetadataXml) {
  const snapshotVersionBlocks = snapshotMetadataXml.match(
    /<snapshotVersion>[\s\S]*?<\/snapshotVersion>/g,
  );

  if (!snapshotVersionBlocks?.length) {
    throw new Error("Could not find any <snapshotVersion> entries.");
  }

  for (const block of snapshotVersionBlocks) {
    const extension = getXmlTagValue(block, "extension");
    const classifier = getXmlTagValue(block, "classifier");
    const value = getXmlTagValue(block, "value");

    if (extension === "jar" && !classifier && value) {
      return value;
    }
  }

  throw new Error(
    "Could not find an unclassified jar snapshotVersion entry in snapshot metadata.",
  );
}

async function resolveLatestSnapshotDownload() {
  const rootMetadataUrl = new URL("maven-metadata.xml", SNAPSHOT_REPO_URL);
  const rootMetadataXml = await fetchText(rootMetadataUrl);
  const snapshotVersion =
    getXmlTagValue(rootMetadataXml, "latest") ||
    getXmlTagValues(rootMetadataXml, "version").at(-1);

  if (!snapshotVersion) {
    throw new Error(
      `Could not determine the latest snapshot version from ${rootMetadataUrl.toString()}.`,
    );
  }

  const versionMetadataUrl = new URL(
    `${snapshotVersion}/maven-metadata.xml`,
    SNAPSHOT_REPO_URL,
  );
  const versionMetadataXml = await fetchText(versionMetadataUrl);
  const resolvedSnapshotVersion = parseSnapshotJarVersion(versionMetadataXml);
  const lastUpdated =
    getXmlTagValue(versionMetadataXml, "lastUpdated") ||
    getXmlTagValue(rootMetadataXml, "lastUpdated") ||
    "0";
  const downloadUrl = new URL(
    `${snapshotVersion}/${ARTIFACT_ID}-${resolvedSnapshotVersion}.jar`,
    SNAPSHOT_REPO_URL,
  );

  return {
    kind: "snapshot",
    downloadUrl,
    lastUpdated,
    version: resolvedSnapshotVersion,
  };
}

async function resolveLatestReleaseDownload() {
  const metadataUrl = new URL("maven-metadata.xml", RELEASE_REPO_URL);
  const metadataXml = await fetchText(metadataUrl);
  const releaseVersion =
    getXmlTagValue(metadataXml, "release") ||
    getXmlTagValue(metadataXml, "latest") ||
    getXmlTagValues(metadataXml, "version").at(-1);

  if (!releaseVersion) {
    throw new Error(
      `Could not determine the latest release version from ${metadataUrl.toString()}.`,
    );
  }

  return {
    kind: "release",
    downloadUrl: new URL(
      `${releaseVersion}/${ARTIFACT_ID}-${releaseVersion}.jar`,
      RELEASE_REPO_URL,
    ),
    lastUpdated: getXmlTagValue(metadataXml, "lastUpdated") || "0",
    version: releaseVersion,
  };
}

async function resolveSpecialJarUrl(rawValue) {
  if (rawValue === "LATEST_SNAPSHOT") {
    const snapshot = await resolveLatestSnapshotDownload();
    console.log(
      `[specmatic] Resolved LATEST_SNAPSHOT to ${snapshot.downloadUrl.toString()}`,
    );
    return snapshot.downloadUrl;
  }

  if (rawValue === "LATEST_RELEASE") {
    const release = await resolveLatestReleaseDownload();
    console.log(
      `[specmatic] Resolved LATEST_RELEASE to ${release.downloadUrl.toString()}`,
    );
    return release.downloadUrl;
  }

  if (rawValue === "LATEST") {
    const results = await Promise.allSettled([
      resolveLatestSnapshotDownload(),
      resolveLatestReleaseDownload(),
    ]);
    const candidates = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    if (!candidates.length) {
      const reasons = results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason?.message || String(result.reason))
        .join(" | ");
      throw new Error(
        `Could not resolve LATEST from snapshot or release repositories. ${reasons}`,
      );
    }

    const selected = candidates.sort((left, right) =>
      right.lastUpdated.localeCompare(left.lastUpdated),
    )[0];
    console.log(
      `[specmatic] Resolved LATEST to ${selected.downloadUrl.toString()} (${selected.kind} ${selected.version})`,
    );
    return selected.downloadUrl;
  }

  throw new Error(
    `Unsupported special jar value: ${rawValue}. Supported values are LATEST, LATEST_SNAPSHOT, and LATEST_RELEASE.`,
  );
}

async function resolveDownloadUrl() {
  const rawJarUrl = getJarUrl();
  const directUrl = getDownloadUrl();

  if (directUrl) {
    await verifyDirectJarUrl(directUrl);
    return directUrl;
  }

  return resolveSpecialJarUrl(rawJarUrl);
}

async function dryRunResolveDownloadUrl() {
  const rawJarUrl = getJarUrl();
  if (!rawJarUrl) {
    throw new Error(
      "SPECMATIC_STUDIO_JAR_URL is required for dry-run resolution.",
    );
  }

  const resolvedUrl = await resolveDownloadUrl();
  const jarFileName = getJarFileName(resolvedUrl);
  const jarPath = getJarPath(resolvedUrl);

  console.log("[specmatic] Dry run resolution");
  console.log(`[specmatic] Requested jar value: ${rawJarUrl}`);
  console.log(`[specmatic] Resolved jar URL: ${resolvedUrl.toString()}`);
  console.log(`[specmatic] Download filename: ${jarFileName}`);
  console.log(`[specmatic] Local cache path: ${jarPath}`);

  return {
    requestedValue: rawJarUrl,
    resolvedUrl: resolvedUrl.toString(),
    jarFileName,
    jarPath,
  };
}

async function ensureJarDownloaded() {
  ensureTmpDir();
  const downloadUrl = await resolveDownloadUrl();
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

  if (command === "resolve") {
    await dryRunResolveDownloadUrl();
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
  dryRunResolveDownloadUrl,
  ensureSpecmaticStudioForRun,
  getStudioState,
  isJarModeEnabled,
  setupSpecmaticStudioForRunSync,
  stopSpecmaticStudioForRun,
};
