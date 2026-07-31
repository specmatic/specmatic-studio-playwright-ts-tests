#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const SPEC_ROOT = "specmatic-studio-demo/specs";
const COMPOSE_PROJECT = "specmatic-studio-local-matrix";
const TEST_RESULTS = path.join(REPO_ROOT, "test-results");
const DOCKER_LOGS = path.join(REPO_ROOT, "docker-logs-workdir");
const PLAYWRIGHT_REPORT = path.join(REPO_ROOT, "playwright-report");
const ARTIFACT_ROOT = path.join(REPO_ROOT, "local-matrix-artifacts");
const COMPOSE_FILE = path.join(REPO_ROOT, "specmatic-studio-demo", "docker-compose.yaml");

const GENERATED_OUTPUTS = [PLAYWRIGHT_REPORT, TEST_RESULTS, DOCKER_LOGS];
const DOCKER_CONTAINERS = ["studio", "order-bff", "order-api", "inventory-api"];
const MATRIX_GROUPS = [
  {
    name: "OpenAPI Examples",
    testPath: "specs/openapi/generate-valid-examples",
    artifactName: "openapi-examples",
  },
  {
    name: "OpenAPI Dictionary",
    testPath: "specs/openapi/dictionary",
    artifactName: "openapi-dictionary",
  },
  {
    name: "OpenAPI Contract",
    testPath: "specs/openapi/execute-contract-tests",
    artifactName: "openapi-contract",
  },
  {
    name: "OpenAPI Spec",
    testPath: "specs/openapi/update-service-spec",
    artifactName: "openapi-spec",
  },
  {
    name: "OpenAPI Mock",
    testPath: "specs/openapi/run-mock-server",
    artifactName: "openapi-mock",
  },
  { name: "Config", testPath: "specs/config/service-spec-config", artifactName: "config" },
  { name: "Async Spec", testPath: "specs/async/update-service-spec", artifactName: "async-spec" },
  { name: "Async Mock", testPath: "specs/async/run-mock-server", artifactName: "async-mock" },
  {
    name: "Async Contract",
    testPath: "specs/async/execute-contract-tests",
    artifactName: "async-contract",
  },
  { name: "Proxy", testPath: "specs/proxy", artifactName: "proxy" },
  { name: "SOAP Spec", testPath: "specs/soap/update-service-spec", artifactName: "soap-spec" },
  { name: "SOAP Mock", testPath: "specs/soap/run-mock-server", artifactName: "soap-mock" },
  {
    name: "SOAP Contract",
    testPath: "specs/soap/execute-contract-tests",
    artifactName: "soap-contract",
  },
];

let isTerminating = false;
let terminationRequested = false;
let activeChildProcess;

function parseArguments(argumentsList) {
  const options = {
    excludedGroups: [],
    testPaths: [],
    headless: true,
    version: process.env.ENTERPRISE_VERSION || "latest",
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--version" || argument === "-v") {
      options.version = argumentsList[++index];
    } else if (argument === "--group") {
      options.group = argumentsList[++index];
    } else if (argument === "--test-path") {
      options.testPaths.push(argumentsList[++index]);
    } else if (argument === "--exclude-group" || argument === "--skip-group") {
      options.excludedGroups.push(argumentsList[++index]);
    } else if (argument === "--headless" || argument.startsWith("--headless=")) {
      const inlineValue = argument.split("=", 2)[1];
      const nextArgument = argumentsList[index + 1];
      const value = inlineValue || nextArgument;
      if (value === "true" || value === "false") {
        options.headless = value === "true";
        if (!inlineValue) index += 1;
      } else if (inlineValue) {
        throw new Error("--headless must be true or false");
      } else {
        options.headless = true;
      }
    } else if (argument === "--headed") {
      options.headless = false;
    } else if (argument === "--help" || argument === "-h") {
      options.showHelp = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!options.showHelp) validateVersion(options.version);
  if (options.group && options.testPaths.length > 0) {
    throw new Error("Use either --group or --test-path, not both");
  }
  return options;
}

function createFocusedTestTarget(testPath) {
  if (!testPath || path.isAbsolute(testPath) || testPath.includes("..")) {
    throw new Error("--test-path must be a repository-relative test path");
  }

  const absoluteTestPath = path.resolve(REPO_ROOT, testPath);
  if (!fs.existsSync(absoluteTestPath)) {
    throw new Error(`Test path does not exist: ${testPath}`);
  }

  return {
    name: `Focused: ${testPath}`,
    testPath,
    artifactName: `focused-${testPath.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  };
}

function validateVersion(version) {
  if (!version) throw new Error("Version cannot be empty");
  if (!/^[A-Za-z0-9._-]+$/.test(version)) {
    throw new Error("Version must contain only letters, numbers, ., _, and -");
  }
}

function resolveEnterpriseImage(version) {
  const versionedImage = `specmatic/enterprise:${version}`;
  if (hasLocalDockerImage(versionedImage)) return versionedImage;
  if (version.endsWith("-SNAPSHOT")) return "specmatic/enterprise-snapshot";
  return versionedImage;
}

function hasLocalDockerImage(image) {
  const result = spawnSync("docker", ["image", "inspect", image], { cwd: REPO_ROOT, stdio: "ignore" });
  return result.status === 0;
}

function findGroup(identifier) {
  const group = MATRIX_GROUPS.find((candidate) =>
    [candidate.name, candidate.testPath, candidate.artifactName].includes(identifier),
  );

  if (!group) throw new Error(`Unknown group: ${identifier}`);
  return group;
}

function selectGroups(groupName, excludedGroupNames) {
  const includedGroups = groupName ? [findGroup(groupName)] : MATRIX_GROUPS;
  const excludedGroups = new Set(excludedGroupNames.map(findGroup));
  const selectedGroups = includedGroups.filter((group) => !excludedGroups.has(group));

  if (!selectedGroups.length) throw new Error("No groups selected");
  return selectedGroups;
}

function createEnvironment(version, groupName, headless) {
  return {
    ...process.env,
    GROUP_NAME: groupName,
    HEADLESS: String(headless),
    PLAYWRIGHT_HTML_OPEN: "never",
    ENTERPRISE_IMAGE: resolveEnterpriseImage(version),
    BASE_URL: "http://localhost:9000/_specmatic/studio",
  };
}

function commandExecutable(command) {
  return process.platform === "win32" && command === "npx" ? "npx.cmd" : command;
}

function stopChildProcess(childProcess, signal) {
  if (!childProcess || childProcess.exitCode !== null) return;

  if (process.platform === "win32") {
    childProcess.kill(signal);
    return;
  }

  try {
    process.kill(-childProcess.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

function runCommand(command, argumentsList, environment) {
  console.log(`$ ${command} ${argumentsList.join(" ")}`);

  return new Promise((resolve, reject) => {
    const childProcess = spawn(commandExecutable(command), argumentsList, {
      cwd: REPO_ROOT,
      env: environment,
      stdio: "inherit",
      detached: process.platform !== "win32",
    });

    activeChildProcess = childProcess;
    childProcess.once("error", (error) => {
      if (activeChildProcess === childProcess) activeChildProcess = null;
      reject(error);
    });

    childProcess.once("exit", (status, signal) => {
      if (activeChildProcess === childProcess) activeChildProcess = null;
      if (
        signal === "SIGINT" ||
        signal === "SIGTERM" ||
        status === 130 ||
        status === 143
      ) {
        terminationRequested = true;
      }
      resolve(status ?? 1);
    });
  });
}

async function runCompose(argumentsList, environment) {
  return runCommand(
    "docker",
    ["compose", "-p", COMPOSE_PROJECT, "-f", COMPOSE_FILE, ...argumentsList],
    environment,
  );
}

async function removeComposeServices(environment) {
  const status = await runCompose(["down", "--remove-orphans"], environment);
  if (status !== 0) console.error("Docker Compose cleanup failed");
  return status === 0;
}

async function cleanSpecsDirectory(environment) {
  const restoreStatus = await runCommand(
    "git",
    ["restore", "--source=HEAD", "--staged", "--worktree", "--", SPEC_ROOT],
    environment,
  );

  if (restoreStatus !== 0) {
    console.error("Could not restore tracked spec files");
    return false;
  }

  const cleanStatus = await runCommand(
    "git",
    ["clean", "-fdx", "--", SPEC_ROOT],
    environment,
  );
  if (cleanStatus !== 0) {
    console.error("Could not remove untracked spec files");
    return false;
  }

  return true;
}

function clearGeneratedOutputs() {
  for (const outputPath of GENERATED_OUTPUTS) {
    fs.rmSync(outputPath, { recursive: true, force: true });
  }
}

async function startServices(environment) {
  if (!(await removeComposeServices(environment))) {
    console.error("Could not remove existing Docker Compose services");
    return false;
  }

  const pullArguments = hasLocalDockerImage(environment.ENTERPRISE_IMAGE)
    ? ["pull", "order-bff", "order-api", "inventory-api"]
    : ["pull"];

  if ((await runCompose(pullArguments, environment)) !== 0) {
    console.error("Docker image pull failed");
    return false;
  }

  const startArguments = ["up", "-d", "--wait", "--wait-timeout", "120"];
  if ((await runCompose(startArguments, environment)) !== 0) {
    console.error("Docker Compose startup failed");
    return false;
  }

  return true;
}

async function restartStudio(environment) {
  if ((await runCompose(["restart", "studio"], environment)) !== 0) {
    console.error("Studio restart failed");
    return false;
  }

  return (await runCompose(
    ["up", "-d", "--wait", "--wait-timeout", "120", "studio"],
    environment,
  )) === 0;
}

function captureDockerLogs(destination, environment) {
  fs.mkdirSync(destination, { recursive: true });

  for (const container of DOCKER_CONTAINERS) {
    const result = spawnSync("docker", ["logs", container], {
      cwd: REPO_ROOT,
      env: environment,
      encoding: "utf8",
    });

    if (result.status === 0 || result.stdout || result.stderr) {
      fs.writeFileSync(
        path.join(destination, `${container}.log`),
        `${result.stdout || ""}${result.stderr || ""}`,
      );
    }
  }
}

function copyIfPresent(sourcePath, destinationPath) {
  if (fs.existsSync(sourcePath)) {
    fs.cpSync(sourcePath, destinationPath, { recursive: true });
  }
}

async function generateGroupSummary(group, artifactDirectory, environment) {
  const summaryEnvironment = {
    ...environment,
    PLAYWRIGHT_RUN_NAME: group.name,
    PLAYWRIGHT_ARTIFACT_DIR: artifactDirectory,
    PLAYWRIGHT_DOCKER_LOGS_DIR: DOCKER_LOGS,
  };

  return runCommand(
    process.execPath,
    ["utils/generate-failed-test-screenshots-summary.js"],
    summaryEnvironment,
  );
}

function readJUnitCounts() {
  const reportPath = path.join(PLAYWRIGHT_REPORT, "junit-report.xml");
  if (!fs.existsSync(reportPath)) {
    console.error(`JUnit report not found: ${reportPath}`);
    return null;
  }

  const report = fs.readFileSync(reportPath, "utf8");
  const sumAttribute = (attribute) =>
    [...report.matchAll(new RegExp(`${attribute}="(\\d+)"`, "g"))]
      .map((match) => Number(match[1]))
      .reduce((total, count) => total + count, 0);

  return {
    tests: sumAttribute("tests"),
    failures: sumAttribute("failures"),
    errors: sumAttribute("errors"),
  };
}

function hasPassingResults() {
  const counts = readJUnitCounts();
  if (!counts) return false;

  console.log(`Results: tests=${counts.tests}, failures=${counts.failures}, errors=${counts.errors}`);
  return counts.tests > 0 && counts.failures === 0 && counts.errors === 0;
}

async function saveGroupArtifacts(group, environment) {
  const artifactDirectory = path.join(ARTIFACT_ROOT, group.artifactName);
  fs.mkdirSync(artifactDirectory, { recursive: true });
  captureDockerLogs(DOCKER_LOGS, environment);

  const jsonReport = path.join(PLAYWRIGHT_REPORT, "test-results.json");
  if (fs.existsSync(jsonReport)) {
    await generateGroupSummary(group, artifactDirectory, environment);
  }

  copyIfPresent(PLAYWRIGHT_REPORT, path.join(artifactDirectory, "playwright-report"));
  copyIfPresent(TEST_RESULTS, path.join(artifactDirectory, "test-results"));
  return hasPassingResults();
}

async function runGroup(group, environment) {
  let testsPassed = false;
  console.log(`\n=== ${group.name} ===`);

  try {
    clearGeneratedOutputs();
    const testStatus = await runCommand("npx", ["playwright", "test", group.testPath], environment);
    testsPassed = testStatus === 0;
  } catch (error) {
    console.error(error.message || error);
  } finally {
    let artifactsPassed = false;

    try {
      artifactsPassed = await saveGroupArtifacts(group, environment);
    } catch (error) {
      console.error(`Artifact collection failed for ${group.name}:`, error.message || error);
    }

    testsPassed = testsPassed && artifactsPassed;
    testsPassed = testsPassed && (await cleanSpecsDirectory(environment));
    clearGeneratedOutputs();
  }

  return testsPassed;
}

function handleTermination(signal) {
  if (isTerminating) return;
  isTerminating = true;
  terminationRequested = true;
  console.error(`\nReceived ${signal}; cleaning up Docker Compose...`);
  const childProcess = activeChildProcess;
  if (childProcess) {
    stopChildProcess(childProcess, signal);
    setTimeout(() => stopChildProcess(childProcess, "SIGTERM"), 1000).unref();
  }
}

process.on("SIGINT", () => handleTermination("SIGINT"));
process.on("SIGTERM", () => handleTermination("SIGTERM"));

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.showHelp) {
    console.log("Usage: npm run test:matrix:local -- [--version VERSION] [--group GROUP | --test-path PATH ...] [--exclude-group GROUP] [--headless[=true|false]]");
    return;
  }

  const groups = options.testPaths.length > 0 ? options.testPaths.map(createFocusedTestTarget) : selectGroups(options.group, options.excludedGroups);
  fs.rmSync(ARTIFACT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(ARTIFACT_ROOT, { recursive: true });

  console.log(`Running ${groups.length} group(s) sequentially with ${resolveEnterpriseImage(options.version)}`);
  const failedGroups = [];
  const lifecycleEnvironment = createEnvironment(options.version, "matrix", options.headless);
  try {
    if (!(await cleanSpecsDirectory(lifecycleEnvironment))) {
      failedGroups.push(...groups);
    } else if (!(await startServices(lifecycleEnvironment))) {
      failedGroups.push(...groups);
    } else {
      for (const [index, group] of groups.entries()) {
        const groupEnvironment = createEnvironment(options.version, group.name, options.headless);
        if (index > 0 && !(await restartStudio(groupEnvironment))) {
          failedGroups.push(group);
        } else if (!(await runGroup(group, groupEnvironment))) {
          failedGroups.push(group);
        }
        if (terminationRequested) break;
      }
    }
  } finally {
    await removeComposeServices(lifecycleEnvironment);
    await cleanSpecsDirectory(lifecycleEnvironment);
  }

  if (terminationRequested) {
    console.error("\nMatrix run interrupted.");
    process.exitCode = 130;
    return;
  }

  if (failedGroups.length) {
    console.error(`\nFailed groups: ${failedGroups.map((group) => group.name).join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("\nAll groups passed.");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
