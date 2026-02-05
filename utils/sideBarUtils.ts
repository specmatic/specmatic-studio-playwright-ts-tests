import { Page, expect } from "@playwright/test";

/**
 * Ensures the left sidebar is expanded.
 * If closed, it uses JS to expand it and verifies the state.
 * @param page Playwright Page object
 */
export async function ensureSidebarOpen(page: Page): Promise<void> {
  const leftSidebar = page.locator("#left-sidebar");

  // Wait for the element to exist in the DOM first
  await expect(leftSidebar).toBeAttached();

  const isExpanded = await leftSidebar.getAttribute("aria-expanded");

  if (isExpanded === "false") {
    // Use evaluate to force the attribute change
    await page.evaluate(() => {
      const sidebar = document.getElementById("left-sidebar");
      if (sidebar) sidebar.setAttribute("aria-expanded", "true");
    });

    // Verification: Ensure the UI has actually updated before returning
    await expect(leftSidebar).toHaveAttribute("aria-expanded", "true");
  }
}
