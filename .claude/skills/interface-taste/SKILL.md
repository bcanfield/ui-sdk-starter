---
name: interface-taste
description: Visual design taste for web UIs - a quiet, dense, near-monochrome interface with one accent, a three-font role system, restrained motion and honest microcopy. Use when designing, styling, polishing or reviewing any page, component or layout; choosing colours, type, spacing or animation; or writing UI copy (labels, empty states, tooltips, feedback messages). Use alongside the ui-sdk skill, which takes precedence.
---

# Interface taste

## In this repo

This app is built on ui-sdk (`@ui-sdk/react` + `@ui-sdk/core/web.css`) with plain CSS, no Tailwind. Load the `ui-sdk` skill first. It decides which component to use, ARIA, state attributes and contrast, and it wins wherever this skill still seems to disagree.

- Tokens: `src/styles/tokens.css`. Each color is `light-dark(<light>, <dark>)`, and the ui-sdk `--ui-*` tokens are set from them. Nothing else writes a color literal, and `src/test/style-guard.test.ts` enforces that.
- Token names, values and the font, size, radius, easing and duration scales live in `src/styles/tokens.css`. Read it instead of trusting a list here; add new tokens there.
- Style ui-sdk parts by `[data-slot="…"]` and their state attributes (`data-open`, `data-pressed`, `data-checked`, `data-starting-style`, `data-ending-style`…), in `src/index.css` or a CSS file next to the component.

The target is a **quiet** interface: neutral surfaces, hairline borders, one accent, small mono chrome, and a single signature element that gives it character. Hierarchy comes from text tier and opacity before size or colour. Every detail is small; the polish is in how many of them are right.

Commit to the direction before styling: name the one signature element (usually the display typeface) and keep everything else quiet around it, so the signature carries the identity and nothing competes with it.

## Colour

Build the palette as **semantic ramps**, then style only through them:

- **Surfaces**, four steps from page to interactive: `surface` (page) → `surface-raised` (inset controls, active tab) → `surface-card` (cards, menus, inputs) → `surface-hover`. In dark mode the steps are only a few lightness points apart (near-black to dark grey).
- **Edges**, two: `edge` for borders that define a shape, `edge-subtle` for row dividers and code chips. Borders are 1px. Hairline `--edge`/`--edge-subtle`, including reduced opacity, is only for dividers, cards and nav. **Control edges** (inputs, select triggers, checkboxes, buttons) use `--ui-input` (= `--edge-control`), which must reach 3:1 against its surface.
- **Text**, three tiers: `primary` (values, names, headings), `secondary` (body, prose), `muted` (labels, metadata, placeholders, icons at rest).
- **One accent.** It marks focus rings, text selection, the current page, the active option, link hover, and one ambient glow. Use it sparingly enough that it always means "here" or "go".
- **Status colours** named by meaning (ok, warning, danger, info, plus a graded scale when the data is graded). They colour data and state, never decoration.
- **Colour marks exceptions.** Normal states stay neutral: a healthy status keeps a small ok dot, but its word and numbers sit in `secondary`/`muted`. Only warning and danger values take colour.
- **Muted text passes AA** (4.5:1) on `surface`, `surface-card` and `surface-hover` (it is `--ui-muted`, the selected/hover fill), in both themes. Check the ratio when you set `muted`; it is the token most often too faint. The style-guard test checks it.

Derive every tint from a token with `color-mix(in srgb, <token> N%, transparent)` instead of adding hex values:

| Use | Recipe |
| --- | --- |
| Badge / chip / callout | border at 20-30%, background at 5-12%, text at full strength |
| Card hover border | accent mixed 28-38% into `edge` |
| Field focus border | `--ui-ring-border` (solid `--accent`). A 40-45% mix fails 3:1. |
| Focus ring | Comes from ui-sdk's `web.css` (4px `--ui-ring`, offset 0) and is themed only through `--ui-ring` (= `--accent`). Never redrawn in app CSS. A 75% mix fails 3:1 in light. |
| Selection | accent at 30% |
| Danger menu item hover | danger at ~12% background, danger text |
| Ambient glow | one radial gradient of accent at ~10%, behind the top of the page, fading by 70% |

Both schemes are defined once per token with `light-dark(light, dark)`. Never write per-component overrides or `html.light` rules. The scheme is ui-sdk's `colorScheme` (`src/theme/color-scheme.ts`): System by default, Light/Dark persisted, applied as `data-color-scheme` on `<html>` before paint. In light, status and accent tokens are a shade darker so they keep contrast; the test proves it.

## Typography

Three families, each with a fixed role:

- **Sans** for prose, item names and descriptions.
- **Mono** for interface chrome: nav links, labels, metadata, controls, pills, numbers, kbd hints, empty states. This is the most-used face; mono chrome is what makes the UI read as an instrument. `src/index.css` already sets mono on button, toggle, select-trigger, segmented-control-item, alert-dialog trigger/close and `kbd`. Extend that `:where()` list for new chrome slots; don't set fonts per component.
- **Display** (a characterful face, e.g. a pixel or condensed font) for page titles, section headings, the brand mark and the rare all-caps callout tag. It is the signature, so it never appears in body text or controls.

Default to **Geist Sans** (sans), **Geist Mono** (mono) and **Geist Pixel** (display), self-hosted. Each font token names the loaded face, then a fallback: sans falls back to `system-ui, sans-serif`, mono to `ui-monospace, monospace`, and display to the mono stack, so a missing display face degrades to mono rather than sans. The fonts are loaded in `src/main.tsx` via Fontsource; sans and mono are `--ui-font-sans`/`--ui-font-mono`, so ui-sdk controls pick them up, and display is `--font-display`. Swap the families only when the product already has a type system; keep the three roles either way.

Sizes and rhythm:

- Chrome uses small fixed pixel sizes through the role tokens: `--size-eyebrow` (eyebrow labels, group headers), `--size-meta`, `--size-control` (controls and nav; ui-sdk's `--ui-font-size` is the same size) and `--size-summary` (a summary sentence). Prose uses rem.
- **Eyebrow labels**: mono, `--size-eyebrow`, uppercase, letter-spacing 0.08-0.16em, `muted`. They head spec values, list groups and hero kickers.
- Headings and names: letter-spacing about -0.02em, weight 500-600, tight line-height (1.05 for display titles, 1.25 for section heads).
- Hero titles scale fluidly with `clamp()` between a mobile and desktop size.
- Prose: line-height 1.6-1.7, measure capped around 34rem for ledes and 3xl (~48rem) for articles. `strong` lifts to `primary`; list markers sit in `muted`.
- Numbers that align or update use `tabular-nums`.
- Nav labels are lowercase.

## Hierarchy and density

- Rank by **text tier and opacity first**. Items that matter less (unavailable, poor fit) drop to `--fg-muted` (still 4.5:1), so they stay scannable without competing. Opacity below that is only for **disabled** controls, which WCAG exempts. Never fade readable text below 4.5:1.
- Dense lists are **open rows** under a section head: ~3.3rem tall, 1px `edge-subtle` dividers, no divider on the last row, and no card border or fill around the list. Offer a compact **list mode** beside a card mode when people scan many items; list mode drops secondary fields and keeps one quiet row of name, key metric, score. The mode switch is a ui-sdk **Segmented Control**, persisted with `createPreference` if it should stick.
- Proportions use ui-sdk **Meter** (or **Progress** for task progress), restyled to 3px and fully rounded. Reset `web.css`'s `min-width: 12rem` where needed, and keep the value as text. A segmented distribution with no ui-sdk equivalent is decorative markup with `aria-hidden` and text counts beside it.
- Separators are glyphs in `edge` or `muted` colour: `/` in breadcrumbs, `·` between inline items.
- Show the **unknown state** explicitly: `—` for a missing value, `detecting...` while loading.

## Shape and depth

- Radius scale: `--ui-radius` drives every ui-sdk control. Use `--radius-sm` for code, `--radius-md` for small inline controls, `--radius-lg` for menus, popovers and cards, and 999px for pills and meters. With `--ui-radius` above 0, switch and slider thumbs are fully round (ui-sdk behaviour).
- Flat by default. Shadows appear only on **floating layers** (tooltips, menus, popovers, drawers). A floating layer is the card surface made translucent (`--surface-floating`) with `backdrop-filter: blur(var(--blur-floating))`, the 1px `--ui-border` edge, and the soft wide `--ui-shadow`. `src/index.css` applies it to the ui-sdk popup slots; add new popup slots to that list. Measure painted contrast over real content (ui-sdk testing.md › Contrast).
- Icons are small (12-18px), `currentColor`, `muted` at rest, brightening to `primary` or accent on hover.

## Page patterns

- **Hero**: centred stack of eyebrow kicker, display title, short lede in `secondary`, then a wrap of mono pill links. A faint accent glow sits behind it.
- **Pills**: a pill that navigates is an `<a>`. A pill that toggles a filter is ui-sdk **Toggle** (styled by `[data-pressed]`), and a set of them is a **Toolbar** or **Toggle** group, never a `<button aria-pressed>` you write yourself. Mono, `--size-control`, 1px edge, card surface, fully rounded, as tall as ui-sdk controls; hover lifts text to `primary`, tints the border toward accent and steps the surface.
- **Section heads**: title (with a small `muted` icon) on the left, a mono one-line subtitle on the right, baseline-aligned, a 1px edge underneath.
- **Callouts**: tinted box (status colour at 30% border, 5% background) led by a short uppercase tag in the display face.
- **Inline-editable values**: ui-sdk **Select** with its `select-trigger` restyled: transparent border and background at rest, border plus `--surface-hover` on hover and `[data-open]`. Keep the web.css chevron or swap it through `--ui-icon-chevron`.

## Microcopy

- Summaries are one plain sentence with the numbers lifted to `primary`: "**12** of **80** items fit comfortably".
- Turn numeric thresholds into plain words people feel (for example Low, Normal, High) and colour them by status only when the value is an exception.
- Tooltips explain jargon in one line: "TERM — what it is. What higher means." Use ui-sdk **Tooltip**.
- Say when a figure is an estimate, and say why, in a visible callout.
- Empty states: a short muted title ("No items found") plus one line naming the fix ("Try adjusting your search or filters"); when there is a direct fix, make it an inline button.
- Feedback names the object: "Install command copied to clipboard." / "Could not copy the install command." Show it with ui-sdk **Toast**, or an `<output aria-label="…">` beside the control (as `src/sections/` does).
- Freshness as relative time in mono: "updated 3h ago".

## Motion

Motion is fast, ease-out, small in distance and gated by purpose and frequency. Read [references/motion.md](references/motion.md) before adding or reviewing any transition, animation, hover effect, popover, tooltip, skeleton or gesture.

## Reviewing UI

Check every rule above against the code, then report findings as one markdown table, one row per issue:

| Before | After | Why |
| --- | --- | --- |
| `#3b2f9c` hard-coded on a badge | `color-mix(in srgb, var(--info) 10%, transparent)` | Tints derive from tokens |

The review is done when every colour, font role, radius, shadow, transition and string in scope has been checked.
