import { Locator, Page, expect } from "@playwright/test";

export class SpecEditorPage {
  constructor(private readonly page: Page) {}

  async getDocumentText(
    content: Locator,
    scroller: Locator,
    lines: Locator,
  ): Promise<string> {
    await expect(content).toBeVisible({ timeout: 10000 });

    const textFromApi = await content.evaluate((el) => {
      const cmEditor = el.closest(".cm-editor") as any;
      const view = cmEditor?.cmView?.view;
      return view?.state?.doc?.toString?.() ?? "";
    });

    if (textFromApi.trim().length > 0) {
      return textFromApi.trim();
    }

    await this.loadFullEditorDocument(scroller);
    const textFromLines = (await lines.allInnerTexts()).join("\n").trim();

    if (textFromLines.length === 0) {
      throw new Error("Could not read text from the spec editor");
    }

    return textFromLines;
  }

  async loadFullEditorDocument(scroller: Locator): Promise<void> {
    await expect(scroller).toBeVisible({ timeout: 10000 });

    let unchangedCount = 0;
    let previousScrollHeight = -1;

    for (let i = 0; i < 60; i++) {
      const metrics = await scroller.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
        return {
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        };
      });

      if (metrics.scrollHeight === previousScrollHeight) {
        unchangedCount += 1;
      } else {
        unchangedCount = 0;
      }

      previousScrollHeight = metrics.scrollHeight;

      const atBottom =
        metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 2;
      if (atBottom && unchangedCount >= 2) break;

      await this.page.waitForTimeout(120);
    }
  }

  async focusTermUsingCodeMirrorApi(
    content: Locator,
    searchTerm: string,
  ): Promise<boolean> {
    return await content.evaluate((el, term) => {
      const cmEditor = el.closest(".cm-editor") as any;
      const view = cmEditor?.cmView?.view;
      if (!view) return false;

      const fullText = view.state.doc.toString() as string;
      const index = fullText.indexOf(term);
      if (index === -1) return false;

      view.dispatch({
        selection: { anchor: index, head: index + term.length },
        scrollIntoView: true,
      });
      return true;
    }, searchTerm);
  }

  async scrollEditorToFindTerm(
    content: Locator,
    scroller: Locator,
    lines: Locator,
    searchTerm: string,
  ): Promise<void> {
    await scroller.evaluate((el) => {
      el.scrollTop = 0;
    });
    await this.page.waitForTimeout(120);

    for (let i = 0; i < 250; i++) {
      const match = lines.filter({ hasText: searchTerm }).first();
      if ((await match.count()) > 0) {
        await match.scrollIntoViewIfNeeded();
        return;
      }

      const moved = await scroller.evaluate((el) => {
        const prev = el.scrollTop;
        el.scrollTop = Math.min(
          el.scrollTop + Math.max(el.clientHeight * 0.85, 120),
          el.scrollHeight,
        );
        return el.scrollTop > prev;
      });

      if (!moved) break;
      await this.page.waitForTimeout(80);
    }

    await content.hover();
    for (let i = 0; i < 280; i++) {
      const visible = await lines.evaluateAll(
        (els, term) => els.some((el) => el.textContent?.includes(term)),
        searchTerm,
      );
      if (visible) return;
      await this.page.mouse.wheel(0, 900);
      await this.page.waitForTimeout(60);
    }

    throw new Error(`Could not find '${searchTerm}' in the spec editor`);
  }
}
