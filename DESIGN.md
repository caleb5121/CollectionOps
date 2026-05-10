## Visual theme

**Warm paper / deep ink / teal accent.** Editorial serif on the landing page for display headings only; **Geist** for all product UI and landing body.

## Color

| Role | Light | Notes |
|------|--------|--------|
| Ink | `#0f1419` | Primary text, dark hero |
| Hero field | `#0c0f12` | Marketing hero background (static) |
| Elevated dark | `#12151a` | In-app hero bands, value sections |
| Paper | `#f7f5f2` | Marketing mid-band |
| Sheet | `#fafaf8` | FAQ / closing sections |
| App canvas | `#f1f2f4` | Flat cool gray (no multi-stop gradients) |
| Accent | `#0d9488` | CSS `var(--accent)`; links, chart, active hints |
| Primary CTA | `stone-900` / `#1c1917` | Demo and primary actions (not orange) |

## Typography

- **Display (landing H1, major H2 only):** Libre Baskerville via `--font-display`.
- **UI & body:** Geist Sans.
- **Scale:** Display H1 `clamp(2rem, 4vw, 2.75rem)`, semibold, tight leading. Section titles `1.25rem–1.5rem` semibold. Body `1rem` with relaxed leading. Use **sparing** small caps / tracking only for true labels (e.g. chart axis context).

## Motion

- **Ease:** `cubic-bezier(0.23, 1, 0.32, 1)` for entrances and hovers.
- **Scroll:** opacity + small `translateY` (≤12px); stagger 50–70ms.
- **No** infinite background motion on marketing.
- **Press:** `scale(0.97)` on primary buttons where appropriate; avoid `scale(0)` entrances.

## Components

- **Buttons:** `rounded-lg`, explicit `transition` on `transform`, `background-color`, `box-shadow`.
- **Cards:** single 1px border, one soft shadow tier - no stacked glows.
- **Charts:** muted grid, accent stroke, tooltip with neutral border.
