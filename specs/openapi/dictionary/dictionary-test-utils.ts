import type { Page, TestInfo } from "@playwright/test";
import { expect } from "../../../utils/eyesFixture";
import { ExampleGenerationPage } from "../../../page-objects/example-generation-page";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { shouldUseFileWatcherWorkaround } from "../../../utils/fileWatcherWorkaround";

export interface DictionarySpecContext {
  sourceSpecName: string;
  dictionarySpecName: string;
  sourceSpecPage: ServiceSpecConfigPage;
}

export interface DictionaryExamplesContext extends DictionarySpecContext {
  examplePage: ExampleGenerationPage;
}

export function getDictionarySpecName(specName: string): string {
  return specName.replace(/\.yaml$/, "_dictionary.yaml");
}

export function shouldReloadBeforeOpeningDictionary(): boolean {
  return shouldUseFileWatcherWorkaround();
}

export function createDictionarySpecContext(
  page: Page,
  testInfo: TestInfo,
  eyes: any,
  sourceSpecName: string,
): DictionarySpecContext {
  return {
    sourceSpecName,
    dictionarySpecName: getDictionarySpecName(sourceSpecName),
    sourceSpecPage: new ServiceSpecConfigPage(
      page,
      testInfo,
      eyes,
      sourceSpecName,
    ),
  };
}

export function createDictionaryExamplesContext(
  page: Page,
  testInfo: TestInfo,
  eyes: any,
  sourceSpecName: string,
): DictionaryExamplesContext {
  return {
    ...createDictionarySpecContext(page, testInfo, eyes, sourceSpecName),
    examplePage: new ExampleGenerationPage(page, testInfo, eyes, sourceSpecName),
  };
}

export async function openSpecFromSidebar(
  specPage: ServiceSpecConfigPage,
  specName: string,
) {
  await specPage.gotoHomeAndOpenSidebar();
  await specPage.sideBar.selectSpec(specName);
}

export async function openSourceSpec(context: DictionarySpecContext) {
  await openSpecFromSidebar(context.sourceSpecPage, context.sourceSpecName);
  await context.sourceSpecPage.openSpecTab();
}

export async function openExamplesTab(
  context: DictionaryExamplesContext,
  testInfo: TestInfo,
  eyes: any,
  reopenFromSidebar = true,
) {
  if (reopenFromSidebar) {
    await context.examplePage.openExampleGenerationTabForSpec(
      testInfo,
      eyes,
      context.sourceSpecName,
    );
    return;
  }

  await context.examplePage.openExampleGenerationTabFromTab();
}

export async function openDictionarySpec(
  context: DictionarySpecContext,
  page: Page,
  testInfo: TestInfo,
  eyes: any,
) {
  if (shouldReloadBeforeOpeningDictionary()) {
    await page.reload();
  }

  const dictionaryPage = new ServiceSpecConfigPage(
    page,
    testInfo,
    eyes,
    context.dictionarySpecName,
  );

  await openSpecFromSidebar(dictionaryPage, context.dictionarySpecName);
  await dictionaryPage.openSpecTab();

  return dictionaryPage;
}

export async function generateDictionaryAndOpenIt(
  context: DictionarySpecContext,
  page: Page,
  testInfo: TestInfo,
  eyes: any,
) {
  await context.sourceSpecPage.generateDictionary();
  await context.sourceSpecPage.assertGeneratedDictionaryDialog(
    context.dictionarySpecName,
  );
  await context.sourceSpecPage.dismissAlert();
  await expect(page.locator("#alert-container")).toBeEmpty();

  return openDictionarySpec(context, page, testInfo, eyes);
}

export function extractJsonStringValue(
  content: string,
  key: string,
): string | undefined {
  const match = content.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
  return match?.[1];
}

export function extractAllJsonStringValues(
  content: string,
  key: string,
): string[] {
  return Array.from(
    content.matchAll(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "g")),
  ).map((match) => match[1]);
}
