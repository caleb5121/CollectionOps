import { test as base, expect } from "@playwright/test";

/** Noise that should not fail smoke tests (third-party avatars, devtools hints, etc.). */
function isBenignConsoleMessage(text: string): boolean {
  return (
    /Download the React DevTools/i.test(text) ||
    /\[Fast Refresh\]/i.test(text) ||
    /Failed to load resource.*favicon/i.test(text) ||
    /Failed to load resource.*pravatar/i.test(text) ||
    /ResizeObserver loop limit exceeded/i.test(text) ||
    /Webpack is not in development mode/i.test(text)
  );
}

/**
 * Fails the test if the page throws or logs an unexpected console error after the test body runs.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const issues: string[] = [];
    page.on("pageerror", (err) => {
      issues.push(`pageerror: ${err.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (isBenignConsoleMessage(text)) return;
      issues.push(`console.error: ${text}`);
    });
    // Playwright fixture `use`, not React - eslint thinks it's `use` from react-hooks
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright test fixture API
    await use(page);
    expect(issues, issues.join("\n")).toEqual([]);
  },
});

export { expect } from "@playwright/test";
