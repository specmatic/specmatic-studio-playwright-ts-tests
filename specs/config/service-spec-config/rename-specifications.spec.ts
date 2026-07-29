import { test, expect } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { SpecificationRenamePage } from "../../../page-objects/specification-rename-page";
import { shouldUseFileWatcherWorkaround } from "../../../utils/fileWatcherWorkaround";
import * as fs from "fs";
import * as path from "path";

const CONFIG = "specmatic.yaml";
const SPECS_DIR = path.join(process.cwd(), "specmatic-studio-demo", "specs");

const SPECS = {
  openapi: "test-openapi/examples/product_search_bff_v5_examples_2_paths.yaml",
  asyncapi: "test-async/kafka_contract_test.yaml",
  wsdl: "test-soap/contract-tests/inventory_contract_test.wsdl",
} as const;

const RENAMED_SPECS = {
  openapi: "test-openapi/examples/openapi-renamed.yaml",
  asyncapi: "test-async/asyncapi-renamed.yaml",
  wsdl: "test-soap/contract-tests/inventory-renamed.wsdl",
} as const;

test.describe("Specification rename", () => {
  test.describe.configure({ timeout: 120000 });
  let originalConfig: string;
  let originalSpecs: Map<string, string>;

  test.beforeEach(() => {
    restoreRenamedSpecs();
    originalConfig = fs.readFileSync(specPath(CONFIG), "utf-8");
    originalSpecs = new Map(Object.values(SPECS).map((spec) => [spec, fs.readFileSync(specPath(spec), "utf-8")]));
    fs.writeFileSync(specPath(CONFIG), configContent(), "utf-8");
  });

  test.afterEach(() => {
    restoreRenamedSpecs();
    for (const [spec, content] of Array.from(originalSpecs.entries())) fs.writeFileSync(specPath(spec), content, "utf-8");
    fs.writeFileSync(specPath(CONFIG), originalConfig, "utf-8");
  });

  test(
    "rename OpenAPI specification keeps config, editor, reload, and examples working",
    { tag: ["@config", "@renameSpecification", "@openapi"] },
    async ({ page, eyes }, testInfo) => {
      await renameAndAssertFilesystem(page, SPECS.openapi, "openapi-renamed");
      await assertConfigUpdated(SPECS.openapi, RENAMED_SPECS.openapi);

      let specPage = await openSpecNoReload(page, eyes, testInfo, RENAMED_SPECS.openapi);
      await specPage.editSpecInEditor("title: Order BFF", "title: Updated Order BFF");
      await specPage.saveSpecAndAssertSuccessDialog();

      expect(readFixture(RENAMED_SPECS.openapi)).toContain("title: Updated Order BFF");
      const section = page
        .locator(".screen")
        .filter({
          has: page.locator(`.info span[data-path]:has-text("File path: ./${RENAMED_SPECS.openapi}")`),
      })
      .first();

      await section.locator('li.tab[data-type="example"]').click();
      const examplePage = new ExampleGenerationPage(page, testInfo, eyes, RENAMED_SPECS.openapi);
      await examplePage.deleteGeneratedExamples();

      const generate = section.getByRole("button", { name: "Generate" }).first();
      await expect(generate).toBeVisible();
      await generate.click();

      const validate = section.getByRole("button", { name: "Validate" }).first();
      await expect(validate).toBeVisible({ timeout: 30000 });
      await validate.click();

      specPage = await openSpecNoReload(page, eyes, testInfo, RENAMED_SPECS.openapi);
      await specPage.editSpecFile("title: Updated Order BFF", "title: Order BFF");
      specPage = await reloadSpecIfFileWatcherWorkaroundEnabled(
        page,
        eyes,
        testInfo,
        specPage,
        RENAMED_SPECS.openapi,
      );
      await specPage.expectEditorToContainText("title: Order BFF");
    },
  );

  test(
    "rename AsyncAPI specification keeps config, tab, save, and reload working",
    { tag: ["@config", "@renameSpecification", "@async"] },
    async ({ page, eyes }, testInfo) => {
      await renameAndAssertFilesystem(page, SPECS.asyncapi, "asyncapi-renamed");
      await assertConfigUpdated(SPECS.asyncapi, RENAMED_SPECS.asyncapi);

      let specPage = await openSpecNoReload(page, eyes, testInfo, RENAMED_SPECS.asyncapi);
      await specPage.editSpecInEditor("title: Product audits API", "title: Updated Product audits API");
      await specPage.saveSpecAndAssertSuccessDialog();

      expect(readFixture(RENAMED_SPECS.asyncapi)).toContain("title: Updated Product audits API");
      const section = page
        .locator(".screen")
        .filter({
            has: page.locator(`.info span[data-path]:has-text("File path: ./${RENAMED_SPECS.asyncapi}")`),
      })
      .first();

      await section.locator('li.tab[data-type="example"]').click();
      const examples = section.locator('div.example[data-protocol="async"]');
      await expect(examples).toBeVisible({ timeout: 15000 });
      const examplePage = new ExampleGenerationPage(page, testInfo, eyes, RENAMED_SPECS.asyncapi, "async");
      await examplePage.deleteGeneratedExamples();

      const generate = section.getByRole("button", { name: "Generate" }).first();
      await expect(generate).toBeVisible();
      await generate.click();

      const validate = section.getByRole("button", { name: "Validate" }).first();
      await expect(validate).toBeVisible({ timeout: 30000 });
      await validate.click();

      specPage = await openSpecNoReload(page, eyes, testInfo, RENAMED_SPECS.asyncapi);
      await specPage.editSpecFile("title: Updated Product audits API", "title: Product audits API");
      specPage = await reloadSpecIfFileWatcherWorkaroundEnabled(
        page,
        eyes,
        testInfo,
        specPage,
        RENAMED_SPECS.asyncapi,
      );
      await specPage.expectEditorToContainText("title: Product audits API");
    },
  );

  test(
    "rename WSDL specification keeps config, tab, save, and reload working",
    { tag: ["@config", "@renameSpecification", "@soap"] },
    async ({ page, eyes }, testInfo) => {
      await renameAndAssertFilesystem(page, SPECS.wsdl, "inventory-renamed");
      await assertConfigUpdated(SPECS.wsdl, RENAMED_SPECS.wsdl);

      let specPage = await openSpecNoReload(page, eyes, testInfo, RENAMED_SPECS.wsdl);
      await specPage.editSpecInEditor('<wsdl:service name="InventoryService">', '<wsdl:service name="UpdatedInventoryService">');
      await specPage.saveSpecAndAssertSuccessDialog();

      expect(readFixture(RENAMED_SPECS.wsdl)).toContain("UpdatedInventoryService");
      page
        .locator(".screen")
        .filter({
            has: page.locator(`.info span[data-path]:has-text("File path: ./${RENAMED_SPECS.wsdl}")`),
        })
        .first();

      specPage = await openSpecNoReload(page, eyes, testInfo, RENAMED_SPECS.wsdl);
      await specPage.editSpecFile('<wsdl:service name="UpdatedInventoryService">', '<wsdl:service name="InventoryService">');
      specPage = await reloadSpecIfFileWatcherWorkaroundEnabled(
        page,
        eyes,
        testInfo,
        specPage,
        RENAMED_SPECS.wsdl,
      );
      await specPage.expectEditorToContainText("InventoryService");
    },
  );

  test(
    "run suite succeeds after renaming configured OpenAPI, AsyncAPI, and WSDL specifications",
    { tag: ["@config", "@renameSpecification", "@runSuite"] },
    async ({ page, eyes }, testInfo) => {
      await renameAndAssertFilesystem(page, SPECS.openapi, "openapi-renamed");
      await renameAndAssertFilesystem(page, SPECS.asyncapi, "asyncapi-renamed", true);
      await renameAndAssertFilesystem(page, SPECS.wsdl, "inventory-renamed", false);

      const configPage = await openSpecNoReload(page, eyes, testInfo, CONFIG);
      await configPage.clickRunSuite();

      await configPage.waitForExecutionToComplete(500, 30000);
      await expect(configPage.executionProgressDropdown).toHaveAttribute("data-state", "success");
    },
  );
});

async function renameAndAssertFilesystem(
  page: Parameters<typeof openSpecNoReload>[0],
  specName: string,
  newBaseName: string,
  reload: boolean = true
) {
  const specPage = new ServiceSpecConfigPage(page, {} as any, undefined, specName);
  if (reload) {
      await specPage.gotoHomeAndOpenSidebar();
  } else {
      await specPage.openSideBar();
  }

  await specPage.sideBar.selectSpec(specName);
  await specPage.openSpecTab();

  const renamePage = new SpecificationRenamePage(page);
  await renamePage.rename(specName, newBaseName);
  await renamePage.confirmConfigUpdate(CONFIG);

  const renamedSpec = `${path.dirname(specName)}/${newBaseName}${path.extname(specName)}`;
  await expect.poll(() => fs.existsSync(specPath(specName))).toBe(false);
  await expect.poll(() => fs.existsSync(specPath(renamedSpec))).toBe(true);
}

async function openSpecNoReload(page: any, eyes: any, testInfo: any, specName: string) {
  const specPage = new ServiceSpecConfigPage(page, testInfo, eyes, specName);
  await specPage.openSideBar();
  await specPage.sideBar.selectSpec(specName);
  await specPage.openSpecTab();
  return specPage;
}

async function reloadSpecIfFileWatcherWorkaroundEnabled(
  page: any,
  eyes: any,
  testInfo: any,
  specPage: ServiceSpecConfigPage,
  specName: string,
) {
  if (!shouldUseFileWatcherWorkaround()) {
    return specPage;
  }

  await test.step("Reload and reopen renamed spec because file watcher workaround flag is enabled", async () => {
    await page.reload();
  });

  return openSpecNoReload(page, eyes, testInfo, specName);
}

async function assertConfigUpdated(source: string, destination: string) {
  await expect.poll(() => readFixture(CONFIG)).not.toContain(source.split("/").pop()!);
  expect(readFixture(CONFIG)).toContain(destination.split("/").pop()!);
}

function specPath(relativePath: string) {
  return path.join(SPECS_DIR, relativePath);
}

function readFixture(relativePath: string) {
  return fs.readFileSync(specPath(relativePath), "utf-8");
}

function restoreRenamedSpecs() {
  for (const [protocol, source] of Object.entries(SPECS)) {
    const destination = RENAMED_SPECS[protocol as keyof typeof RENAMED_SPECS];
    if (!fs.existsSync(specPath(source)) && fs.existsSync(specPath(destination))) {
      fs.renameSync(specPath(destination), specPath(source));
    }
  }
}

function configContent() {
  return `version: 3
components:
  sources:
    localSpecs:
      filesystem:
        directory: .
  services:
    openapiService:
      definitions:
        - definition:
            source:
              $ref: "#/components/sources/localSpecs"
            specs:
              - spec:
                  id: openapiSpec
                  path: ${SPECS.openapi}
    asyncapiService:
      definitions:
        - definition:
            source:
              $ref: "#/components/sources/localSpecs"
            specs:
              - spec:
                  id: asyncapiSpec
                  path: ${SPECS.asyncapi}
                  specType: asyncapi
    wsdlService:
      definitions:
        - definition:
            source:
              $ref: "#/components/sources/localSpecs"
            specs:
              - spec:
                  id: wsdlSpec
                  path: ${SPECS.wsdl}
`;
}
