import { test, expect } from "./fixtures/test-base";
import {
  ORDER_MIXED_ONEPIECE,
  ORDER_MIXED_POKEMON,
  ORDER_UNMAPPED,
  ORDER_VALID,
  ORDER_VALID_SINGLE_WEEK,
  ORDER_WOW_TWO_WEEKS,
  SUMMARY_APRIL_2024,
  SUMMARY_VALID,
  SUMMARY_JUNE_2024,
  SUMMARY_JUNE_2ORDERS,
} from "./fixtures/paths";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      // Clear localStorage only once per browser session so `page.reload()` preserves saves (Settings, Account).
      if (sessionStorage.getItem("__cardops_e2e_boot") === "1") return;
      sessionStorage.setItem("__cardops_e2e_boot", "1");
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
});

async function openFromHeaderNav(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name }).click();
}

test.describe("Navigation", () => {
  const routes: { path: string; title: string }[] = [
    { path: "/dashboard", title: "Dashboard" },
    { path: "/data", title: "Imports" },
    { path: "/trends", title: "Trends" },
    { path: "/settings", title: "Shipping per order" },
    { path: "/account", title: "Account" },
    { path: "/help", title: "Help & FAQs" },
  ];

  for (const { path, title } of routes) {
    test(`loads ${path} (${title})`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.ok() ?? false).toBeTruthy();
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    });
  }

  test("/imports redirects to /data", async ({ page }) => {
    await page.goto("/imports");
    await expect(page).toHaveURL(/\/data$/);
  });

  test("header primary destinations", async ({ page }) => {
    await page.goto("/dashboard");
    await openFromHeaderNav(page, "Imports");
    await expect(page.getByRole("heading", { level: 1, name: "Imports" })).toBeVisible();
    await openFromHeaderNav(page, "Trends");
    await expect(page.getByRole("heading", { level: 1, name: "Trends" })).toBeVisible();
    await openFromHeaderNav(page, "Dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  });

  test("header settings and FAQs", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("navigation", { name: "More" }).getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Shipping per order" })).toBeVisible();
    await page.getByRole("navigation", { name: "More" }).getByRole("link", { name: "FAQs" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Help & FAQs" })).toBeVisible();
  });
});

test.describe("Empty states", () => {
  test("Dashboard shows no-data CTA", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /No data yet/i })).toBeVisible();
    const cta = page.getByRole("link", { name: "Go to Imports" });
    await expect(cta).toBeVisible();
    await expect(cta).toBeEnabled();
  });

  test("Trends prompts for Order List", async ({ page }) => {
    await page.goto("/trends");
    await expect(page.getByRole("heading", { name: "No trends yet" })).toBeVisible();
    await expect(page.getByText(/Upload your first order list to see performance over time/i)).toBeVisible();
    const cta = page.getByRole("link", { name: "Go to Imports" });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/data$/);
  });

  test("Imports asks for label before upload", async ({ page }) => {
    await page.goto("/data");
    await expect(page.getByText(/Pick a label to upload/i)).toBeVisible();
    await expect(page.getByRole("region", { name: "Order List upload" }).getByText("Add your Order List to begin")).toBeVisible();
    await expect(page.getByRole("region", { name: "Sales Summary upload" }).getByText("Add your Sales Summary to continue")).toBeVisible();
  });
});

test.describe("Imports flow", () => {
  test("valid CSVs map, show rows, and surface dashboard totals", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID);
    await expect(page.getByText("orders-valid.csv")).toBeVisible();
    await expect(page.getByTestId("upload-order-slot-status")).toHaveText(/Accepted - 3 rows/);

    await page.getByTestId("upload-summary-csv").setInputFiles(SUMMARY_VALID);
    await expect(page.getByTitle("summary-valid.csv")).toBeVisible();
    await expect(page.getByTestId("imports-workspace-headline")).toHaveText(/Data looks good/i);
    await page.getByTestId("imports-status-details").locator("summary").click();
    await expect(page.getByTestId("imports-time-alignment-unknown")).toHaveCount(0);
    await expect(page.getByTestId("imports-time-alignment-lines")).toContainText(/Order List:/i);
    await expect(page.getByTestId("imports-summary-dates-inferred-hint")).toBeVisible();
    await expect(page.getByTestId("imports-summary-dates-inferred-hint")).toHaveAttribute(
      "title",
      /Sales summary does not include dates/i,
    );
    await expect(page.getByTestId("imports-financial-consistency")).toContainText(/Batch totals \(from your files\)/i);
    await expect(page.getByTestId("imports-financial-consistency")).not.toContainText(/Your data is ready/);
    await expect(page.getByRole("main")).toContainText("$9.50");

    await page.goto("/dashboard");
    await expect(page.getByText(/^Total Earned$/)).toBeVisible();
    await expect(page.getByTestId("dashboard-total-earned")).toBeVisible();
  });

  test("order and summary in different months block workspace and Dashboard link", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID);
    await page.getByTestId("upload-summary-csv").setInputFiles(SUMMARY_APRIL_2024);
    await expect(page.getByTestId("imports-workspace-headline")).toHaveText(/Fix this batch/i);
    await expect(page.getByTestId("imports-workspace-subtext")).toContainText(/time periods don.?t match/i);
    await expect(page.getByTestId("imports-workspace-headline")).not.toContainText(/different time periods/i);
    await page.getByTestId("imports-status-details").locator("summary").click();
    await expect(page.getByTestId("imports-time-alignment-lines")).toContainText(/Order List:/i);
    await expect(page.getByTestId("imports-time-alignment-lines")).toContainText(/Sales Summary:/i);
    await expect(page.getByTestId("imports-workspace-status").getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  });

  test("duplicate order filename is skipped with alert; only one file row", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID);
    await expect(page.getByRole("listitem").filter({ hasText: "orders-valid.csv" })).toHaveCount(1);
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID);
    const notice = page.getByTestId("upload-order-duplicate-notice");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/This file is already uploaded/);
    await expect(notice).toContainText(/Each file can only be added once/);
    await expect(page.getByRole("listitem").filter({ hasText: "orders-valid.csv" })).toHaveCount(1);
  });

  test("unknown columns reject with clear reason and block workspace", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_UNMAPPED);
    await expect(page.getByText("orders-unmapped.csv")).toBeVisible();
    const status = page.getByTestId("upload-order-slot-status");
    await expect(status).toContainText(/File rejected/i);
    await expect(status).toContainText(/missing required column|invalid format|wrong file/i);
    await expect(page.getByTestId("imports-workspace-headline")).toHaveText(/Fix this batch/i);
    await page.getByTestId("imports-status-details").locator("summary").click();
    const snapshot = page.getByTestId("imports-snapshot-strip");
    await expect(snapshot.locator("p").filter({ hasText: /^-\s*$/ })).toHaveCount(5);
  });
});

test.describe("Import slot mismatch", () => {
  test("sales summary CSV on order slot is rejected; snapshot hidden; workspace blocked", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(SUMMARY_VALID);
    await expect(page.getByText("summary-valid.csv")).toBeVisible();
    const status = page.getByTestId("upload-order-slot-status");
    await expect(status).toContainText(/File rejected/i);
    await expect(status).toContainText(/wrong file type for this slot/i);
    await expect(page.getByTestId("imports-workspace-headline")).toHaveText(/Fix this batch/i);
    await page.getByTestId("imports-status-details").locator("summary").click();
    const snapshot = page.getByTestId("imports-snapshot-strip");
    await expect(snapshot.locator("p").filter({ hasText: /^-\s*$/ })).toHaveCount(5);
  });

  test("order list CSV on summary slot is rejected; workspace blocked", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-summary-csv").setInputFiles(ORDER_VALID);
    await expect(page.getByText("orders-valid.csv")).toBeVisible();
    const status = page.getByTestId("upload-summary-slot-status");
    await expect(status).toContainText(/File rejected/i);
    await expect(status).toContainText(/wrong file type for this slot/i);
    await expect(page.getByTestId("imports-workspace-headline")).toHaveText(/Fix this batch/i);
    await page.getByTestId("imports-status-details").locator("summary").click();
    const snapshot = page.getByTestId("imports-snapshot-strip");
    await expect(snapshot.locator("p").filter({ hasText: /^-\s*$/ })).toHaveCount(5);
  });
});

test("mismatched Order List vs Sales Summary import labels show explicit pair messaging", async ({ page }) => {
  await page.goto("/data");
  await page.getByTestId("import-game-select").selectOption("Pokémon");
  await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID);
  await expect(page.getByTestId("upload-order-slot-status")).toContainText("Accepted");
  await page.getByTestId("import-game-select").selectOption("Digimon");
    await page.getByTestId("upload-summary-csv").setInputFiles(SUMMARY_VALID);
    await page.getByTestId("imports-status-details").locator("summary").click();
    const mismatchBanner = page.getByTestId("imports-label-mismatch-banner");
    await expect(mismatchBanner).toBeVisible();
    await expect(mismatchBanner).toContainText("You mixed Pokémon Orders with Digimon Sales");
  await expect(page.getByTestId("upload-order-paired-label")).toContainText("Paired file is Digimon");
  await expect(page.getByTestId("upload-summary-paired-label")).toContainText("Paired file is Pokémon");
});

test.describe("Mixed import labels", () => {
  test("multiple game labels yield mixed-store analysis (no silent failure)", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_MIXED_POKEMON);
    await expect(page.getByText("orders-mixed-pokemon.csv")).toBeVisible();

    await page.getByTestId("import-game-select").selectOption("One Piece");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_MIXED_ONEPIECE);
    await expect(page.getByText("orders-mixed-onepiece.csv")).toBeVisible();
    await page.getByTestId("imports-status-details").locator("summary").click();
    await expect(page.getByTestId("imports-batch-summary-line")).toContainText(/2 labels/i);

    await summaryCoverage(page);

    await page.goto("/dashboard");
    await expect(page.getByText(/mixed store data/i)).toBeVisible();
  });
});

async function summaryCoverage(page: import("@playwright/test").Page) {
  await page.getByTestId("import-game-select").selectOption("Pokémon");
  await page.getByTestId("upload-summary-csv").setInputFiles(SUMMARY_VALID);
}

test.describe("Settings persistence", () => {
  test("shipping cost persists across reload (autosave)", async ({ page }) => {
    await page.goto("/settings");
    const firstCost = page.locator('input[type="number"]').first();
    await firstCost.fill("2.05");
    await firstCost.blur();
    await page.reload();
    await expect(page.locator('input[type="number"]').first()).toHaveValue("2.05");
  });
});

test.describe("Account profile", () => {
  test("edit, save, reload keeps display name; cancel discards edits", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("button", { name: "Edit profile" })).toBeEnabled();
    await page.getByRole("button", { name: "Edit profile" }).click();
    const unique = `E2E Store ${Date.now()}`;
    await page.locator("#profile-display").fill(unique);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(unique).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(unique).first()).toBeVisible();

    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.locator("#profile-display").fill("should-not-persist-cancel");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("#profile-display")).not.toBeVisible();
    await expect(page.getByText(unique).first()).toBeVisible();
    await expect(page.getByText("should-not-persist-cancel")).not.toBeVisible();
  });

  test("preference switches become interactive after load", async ({ page }) => {
    await page.goto("/account");
    await expect(page.locator("#pref-shipping-net")).toBeEnabled();
  });
});

test.describe("Trends with data", () => {
  test("chart headings appear after valid order upload", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID);
    await page.getByTestId("upload-summary-csv").setInputFiles(SUMMARY_JUNE_2024);
    await page.goto("/trends");
    await expect(page.getByRole("heading", { name: "Revenue over time" })).toBeVisible();
    await expect(page.getByText(/^Total revenue$/)).toBeVisible();
    const totalRev = page.getByTestId("trends-total-revenue");
    await expect(totalRev).not.toHaveText("$0.00");
    await expect(totalRev).toContainText("110");
  });

  test("empty state when no order imports", async ({ page }) => {
    await page.goto("/trends");
    await expect(page.getByRole("heading", { name: "No trends yet" })).toBeVisible();
  });

  test("Trends runs normally when Sales Summary has no dates (uses Order List range)", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID);
    await page.getByTestId("upload-summary-csv").setInputFiles(SUMMARY_VALID);
    await page.goto("/trends");
    await expect(page.getByRole("heading", { name: "Revenue over time" })).toBeVisible();
    await expect(page.getByText("Some data may need review")).toHaveCount(0);
  });

  test("Trends uses only valid batches when draft batch is incomplete", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID);
    await page.getByTestId("upload-summary-csv").setInputFiles(SUMMARY_JUNE_2024);
    await expect(page.getByTestId("imports-add-another-game-button")).toBeEnabled();
    await page.getByTestId("imports-add-another-game-button").click();
    await page.getByRole("button", { name: "Set up next batch" }).click();
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID);
    await page.goto("/trends");
    await expect(page.getByRole("heading", { name: "Revenue over time" })).toBeVisible();
    await expect(page.getByText(/^Total revenue$/)).toBeVisible();
  });

  test("single calendar week of orders shows no comparison line when grouped weekly", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID_SINGLE_WEEK);
    await page.getByTestId("upload-summary-csv").setInputFiles(SUMMARY_JUNE_2ORDERS);
    await page.goto("/trends");
    await expect(page.getByRole("heading", { name: "Revenue over time" })).toBeVisible();
    await page.getByRole("button", { name: "Weekly" }).click();
    const noCompare = page.getByText("No comparison yet");
    await expect(noCompare.first()).toBeVisible();
    await expect(noCompare).toHaveCount(3);
  });

  test("two calendar weeks unlock vs previous period on KPIs", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_WOW_TWO_WEEKS);
    await page.getByTestId("upload-summary-csv").setInputFiles(SUMMARY_JUNE_2024);
    await page.goto("/trends");
    await expect(page.getByRole("heading", { name: "Revenue over time" })).toBeVisible();
    const wowLines = page.getByText(/vs previous period/);
    await expect(wowLines.first()).toBeVisible();
    await expect(wowLines).toHaveCount(3);
  });
});

test.describe("Dashboard with imports", () => {
  test("hero shows currency after imports; key sections render", async ({ page }) => {
    await page.goto("/data");
    await page.getByTestId("import-game-select").selectOption("Pokémon");
    await page.getByTestId("upload-order-csv").setInputFiles(ORDER_VALID);
    await page.getByTestId("upload-summary-csv").setInputFiles(SUMMARY_VALID);
    await page.goto("/dashboard");
    await expect(page.getByText(/^Total Earned$/)).toBeVisible();
    await expect(page.getByText(/^You sold$/i)).toBeVisible();
    await expect(page.getByTestId("dashboard-orders-count")).toBeVisible();
  });
});
