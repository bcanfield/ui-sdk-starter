---
name: interface-engineering
description: Frontend implementation conventions for web UIs - design tokens and theming in CSS, a global base layer, layout stability (no shift while data loads), responsive grids, restyled native controls, ARIA-state styling, accessible tooltips, menus and live feedback, keyboard navigation and URL-held view state. Use when writing or reviewing CSS, HTML or component code, building a control, list, menu, tooltip or theme toggle, or fixing layout shift, overflow or accessibility bugs. Use alongside the ui-sdk skill, which takes precedence.
---

# Interface engineering

## In this repo

Repo setup (ui-sdk, plain CSS, `src/styles/tokens.css` as the token source, the style-guard test, `[data-slot]` styling) is described under "In this repo" in the `interface-taste` skill. Read it first. Load the `ui-sdk` skill before both; it wins wherever they disagree.

Visual decisions (which colours, fonts, timings) live in the `interface-taste` skill. This skill is how to build them so the result is **stable**: nothing jumps while data loads, nothing overflows at any width, and visual state can never drift from semantic state.

## Tokens and theming

Tokens are declared once in `src/styles/tokens.css` on `:root` as `light-dark(light, dark)`. The ui-sdk `--ui-*` tokens are aliases of them, and components reference only tokens. Font tokens: `--ui-font-sans`, `--ui-font-mono`, `--font-display` (falls back to mono). The scheme is ui-sdk `createColorScheme` (`src/theme/color-scheme.ts`): `data-color-scheme` on `<html>`, set before paint by `preferencesScript`, which `vite.config.ts` injects. `<meta name="theme-color">` follows the painted body background (`src/theme/theme-color.ts`). Derive tints with `color-mix()` from tokens.

## Base layer

Already in `src/index.css`: `@layer ui-sdk;` first, `scrollbar-gutter: stable`, `font-synthesis: none`, smoothing, `::selection`, skip link. The focus ring comes from ui-sdk's `web.css` (4px `--ui-ring`, offset 0), is themed only through `--ui-ring`, and is never redrawn in app CSS. Don't repeat them in components.

- A skip link to `#content`, hidden with `translate: 0 -120%` and slid in on `:focus`. The target gets `scroll-margin-top`.
- Inner scroll areas get thin scrollbars: `scrollbar-width: thin` with a thumb of `muted` at ~25% that rises to ~45% on hover, transparent track. For custom scrollbars use ui-sdk **Scroll Area**; for plain overflow containers, set those two scrollbar properties on the container itself.
- When a component suppresses the default outline for a custom indicator, it restores one on `:focus-visible`.

## Layout stability

The page holds its final shape before data arrives:

- Reserve layout space for loading states: render **skeletons with the real row height and count**, and replace them in place. Keep them visible until the data that decides the layout is known; hiding groups early collapses the page.
- Give regions that fill later a `min-height` equal to their filled size: titles (`line-height × font-size`), one-line ledes (`1.6em`), lists (`rows × row height` via a custom property such as `--row: 3.35rem`), button rows.
- Render a fixed number of slots (for example, every field of a row) with `—` placeholders, so loading cannot grow or shrink the row.
- Hide not-yet-ready content with `visibility: hidden` (keeps its box), and use `display: none` only for content whose space should be released.
- Mark the region `aria-busy="true"` while loading and flip it to `false` when filled.
- Comments are rare (ui-sdk rule): comment a size that prevents a shift only when a reader would otherwise remove or break it, in one line saying what it prevents.

## Overflow and grids

- Every flex/grid child that holds text gets `min-width: 0`; text that must stay on one line gets `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`.
- Grid tracks for flexible text are `minmax(0, 1fr)`; numeric columns get fixed widths so values align down the list, with `tabular-nums` and right alignment.
- Shrink-to-content controls use `width: max-content; max-width: 100%`. Size ui-sdk popups with `--anchor-width` and `--available-height`, e.g. `max-height: min(22rem, var(--available-height))`.
- Comment a non-obvious box-model choice only when a reader would otherwise remove or break it, in one line (for example, `box-sizing: content-box` so `max-content` measures the label and padding is added on top).

## Responsive

- Content lives in a centred container with a max width chosen per page type (wide for the app shell, ~3xl for reading) and side padding `1rem` that grows to `1.5rem` from the small breakpoint.
- On narrow screens, **drop columns by priority** rather than squeezing them: redefine `grid-template-columns` at each breakpoint and hide the least important fields.
- A row of fields becomes a two-column grid on mobile with the leading field spanning both columns.
- Desktop-only affordances (keyboard hints, view toggles) appear from the small breakpoint up.
- Mobile navigation: use ui-sdk **Drawer** or **Dialog**. They handle scroll lock, Escape, focus and `aria-expanded`.
- ui-sdk controls are `--ui-spacing × 8` = 32px tall, which passes WCAG 2.5.8 AA. Don't resize individual controls. If a touch-first screen needs larger targets, raise `--ui-spacing` for that scope.

## Controls

Never restyle or hand-build native `<select>`, checkbox, radio, switch or range. Use ui-sdk Select, Combobox, Checkbox, Radio, Switch, Slider and Input inside **Field** (with `name`, they submit with the form). Style them via `--ui-*` tokens and `[data-slot]` + state attributes. A searchable picker is **Combobox** (or **Command** for actions). A search input is ui-sdk Input with a leading icon `<svg aria-hidden>`; a `kbd` hint shows its `useShortcut` key.

## Primitive boundaries

- App wrappers around ui-sdk parts take generic props (`tone`, `label`, `value`) and never import domain types. Map domain values onto them in a small adapter next to the feature (for example, a `StatusBadge` wrapper takes `tone` and `label`, and the feature maps its own status to those two).
- Inline controls already share ui-sdk's height (`--ui-spacing × 8`).

## State drives style

Express component state as attributes and style from them, so the visual and the semantic state are one value:

- Style from ui-sdk's state attributes (`data-pressed`, `data-checked`, `data-open`, `data-highlighted`, `data-disabled`, `data-side`, `data-invalid`…) and `aria-current="page"` for nav. Your own `data-*` (e.g. `data-level`) is fine for values ui-sdk doesn't model. Never use inline styles for state.
- Swap per-state colour by setting one local custom property (`--ctl-color`) in each state rule and reading it everywhere inside the component.
- Data hooks (for example `[data-part="body"]`) select parts of a component for alternate layouts, keeping class names for styling.

## Accessibility

- Icon-only buttons carry `aria-label`; decorative SVGs, separators and visual meters carry `aria-hidden="true"`, with the same information present as text nearby.
- Name each landmark: `<nav aria-label="Primary">`, `<nav aria-label="Breadcrumb">` with an `<ol>`; sections use `aria-labelledby` pointing at their heading. Mark the current page with `aria-current="page"` in nav and breadcrumbs.
- **Tooltips**: use ui-sdk **Tooltip**. It handles focus, hover, Escape and placement. An icon-only button's name comes from `aria-label` (ui-sdk sizes it square).
- **Live feedback**: use ui-sdk **Toast**, or an `<output aria-label>` near the control. A copy button may also update its own `aria-label`.
- Use ui-sdk **Collapsible** or **Accordion** for disclosure (agent-visible; lint forbids `<details>`).
- Status is never colour-only: pair it with a word, icon or label.

## Keyboard

- A list people scan with arrows is a ui-sdk **Listbox** (or `createRovingFocus` via the ui-sdk skill's create-component path). Extra keys such as `j`/`k` or `/` use `useShortcut` from `@ui-sdk/react/shortcuts`; check its docs for how it treats focus in a text field. Escape on overlays is built into ui-sdk.

## Scripts and state

- Keep view state (search, filters, sort, mode) in URL query params, and handle `popstate` so back/forward restores it. Keep old URL shapes working with a redirect into the new state.
- Persist small preferences (theme, favourites) with `createPreference` + `createLocalStorage` from `@ui-sdk/core`.

## Performance

- Preload only the font weights used above the fold.
- Animate `transform` and `opacity`. ui-sdk Meter/Progress are the exception: they set the indicator's width inline (see `interface-taste`'s motion reference).
- Gate hover-only work (previews, hover transforms) behind `matchMedia("(hover: hover) and (pointer: fine)")`, and read `prefers-reduced-motion` in JS before starting a JS animation.

## Reviewing

Walk every section above against the changed code. Done means each heading has been checked and every finding cites `file:line`. Then run the ui-sdk skill's "When you're done" list.
