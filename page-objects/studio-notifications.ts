import { expect, Locator, Page } from "@playwright/test";

export type NotificationType = "default" | "success" | "error" | "info" | "warning" | "loading";
export interface NotificationFilter {
  type?: NotificationType;
  title?: string | RegExp;
  message?: string | RegExp;
}

export interface NotificationDetails {
  title: string;
  message: string;
}

export interface NotificationWatchFilter {
  title?: string;
  type?: NotificationType;
  messageIncludes?: string;
}

export interface NotificationWatchState extends NotificationDetails {
  seen: boolean;
}

interface NotificationSelectors {
  host: string;
  toast: string;
  title: string;
  close: string;
  description: string;
}

export class StudioNotifications {
  private static readonly selectors: NotificationSelectors = {
    title: "[data-title]",
    host: "studio-toast-host",
    toast: "[data-sonner-toast]",
    close: "[data-close-button]",
    description: "[data-description]",
  };

  private readonly page: Page;
  private readonly host: Locator;

  constructor(page: Page) {
    this.page = page;
    this.host = page.locator(StudioNotifications.selectors.host);
  }

  async waitFor(filter: NotificationFilter = {}, timeout = 10000): Promise<NotificationDetails> {
    const toast = this.firstMatchingToast(filter);
    await expect(toast).toBeVisible({ timeout });
    return this.readToast(toast);
  }

  async read(filter: NotificationFilter = {}, timeout = 10000): Promise<NotificationDetails> {
    return this.waitFor(filter, timeout);
  }

  async tryRead(filter: NotificationFilter = {}, timeout = 5000): Promise<NotificationDetails | null> {
    try {
      return await this.read(filter, timeout);
    } catch {
      return null;
    }
  }

  async assert(filter: NotificationFilter, timeout = 10000): Promise<NotificationDetails> {
    const details = await this.waitFor(filter, timeout);

    if (filter.title !== undefined) {
      this.assertText(details.title, filter.title, "title");
    }
    if (filter.message !== undefined) {
      this.assertText(details.message, filter.message, "message");
    }

    return details;
  }

  async close(filter: NotificationFilter = {}, timeout = 5000): Promise<NotificationDetails> {
    const toast = this.firstMatchingToast(filter);
    await expect(toast).toBeVisible({ timeout });

    const details = await this.readToast(toast);
    const closeButton = toast.locator(StudioNotifications.selectors.close).first();
    await expect(closeButton).toBeVisible({ timeout });

    await closeButton.click();
    await expect(toast).toBeHidden({ timeout });
    return details;
  }

  async dismiss(filter: NotificationFilter = {}, timeout = 5000): Promise<boolean> {
    if (!(await this.isVisible(filter))) {
      return false;
    }

    await this.close(filter, timeout);
    return true;
  }

  async isVisible(filter: NotificationFilter = {}): Promise<boolean> {
    return this.firstMatchingToast(filter).isVisible().catch(() => false);
  }

  async count(filter: NotificationFilter = {}): Promise<number> {
    return this.matchingToasts(filter).count();
  }

  async startWatch(filter: NotificationWatchFilter): Promise<void> {
    await this.page.evaluate(
      ({ filter, selectors }) => {
        const watchKey = "__specmaticStudioNotificationWatch";
        const readMatchingToast = () => {
          const typeSelector = filter.type ? `[data-type="${filter.type}"]` : "";
          const toasts = Array.from(
            document.querySelectorAll(`${selectors.host} ${selectors.toast}${typeSelector}`),
          );

          for (const toast of toasts) {
            const title = toast.querySelector(selectors.title)?.textContent?.trim() ?? "";
            const message = toast.querySelector(selectors.description)?.textContent?.trim() ?? "";

            if (
              (filter.title === undefined || title === filter.title) &&
              (filter.messageIncludes === undefined || message.includes(filter.messageIncludes))
            ) {
              return { seen: true, title, message };
            }
          }

          return { seen: false, title: "", message: "" };
        };

        const existingWatch = (window as any)[watchKey];
        existingWatch?.observer?.disconnect();

        const initialState = readMatchingToast();
        const state = { ...initialState };
        const observer = new MutationObserver(() => {
          if (!state.seen) {
            Object.assign(state, readMatchingToast());
          }
        });

        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        (window as any)[watchKey] = { state, observer };
      },
      { filter, selectors: StudioNotifications.selectors },
    );
  }

  async stopWatch(): Promise<NotificationWatchState | null> {
    return this.page.evaluate(() => {
      const watch = (window as any).__specmaticStudioNotificationWatch;
      if (!watch) {
        return null;
      }

      watch.observer?.disconnect();
      return watch.state;
    });
  }

  private matchingToasts(filter: NotificationFilter): Locator {
    const typeSelector = filter.type ? `[data-type="${filter.type}"]` : "";
    let toasts = this.host.locator(`${StudioNotifications.selectors.toast}${typeSelector}`);
    if (filter.title !== undefined) {
      toasts = toasts.filter({
        has: this.page.locator(StudioNotifications.selectors.title).filter({
          hasText: filter.title,
        }),
      });
    }

    if (filter.message !== undefined) {
      toasts = toasts.filter({
        has: this.page
          .locator(StudioNotifications.selectors.description)
          .filter({ hasText: filter.message }),
      });
    }

    return toasts;
  }

  private firstMatchingToast(filter: NotificationFilter): Locator {
    return this.matchingToasts(filter).first();
  }

  private async readToast(toast: Locator): Promise<NotificationDetails> {
    const title = (await toast.locator(StudioNotifications.selectors.title).first().innerText()).trim();
    const description = toast.locator(StudioNotifications.selectors.description);
    const message = (await description.count()) ? (await description.first().innerText()).trim() : "";
    return { title, message };
  }

  private assertText(actual: string, expected: string | RegExp, field: "title" | "message"): void {
    if (expected instanceof RegExp) {
      expect(actual, `Unexpected notification ${field}`).toMatch(expected);
    } else {
      expect(actual, `Unexpected notification ${field}`).toBe(expected);
    }
  }
}
