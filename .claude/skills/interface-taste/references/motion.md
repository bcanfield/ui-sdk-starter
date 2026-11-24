# Motion

Motion confirms an action, keeps space consistent, or softens a change that would otherwise look broken. Everything else stays still.

## Decide in order

1. **Should it animate?** Gate by how often a person sees it:

   | Frequency | Decision |
   | --- | --- |
   | Hundreds of times a day (keyboard shortcuts, command palette) | Instant. No animation. |
   | Tens of times a day (hover, list navigation) | Colour/opacity only, or nothing |
   | Occasional (menus, modals, drawers, toasts) | Standard animation |
   | Rare (onboarding, celebration) | Room for delight |

   Keyboard-initiated actions are always instant: a command palette (ui-sdk **Command**) gets no open animation.

2. **What is its purpose?** Feedback, spatial consistency, state indication or masking a jarring change. "It looks nice" on a frequent element means it stays still.

3. **Easing.** One shared strong ease-out token for UI, `--ease-out` in `tokens.css`. Enter/exit and hover use it; on-screen movement uses the strong `--ease-in-out`; constant motion (spinners, shimmer) is linear. Ease-in is reserved for nothing in UI: it delays the first frame, the one the user watches.

4. **Duration.**

   | Element | Duration |
   | --- | --- |
   | Hover colour, border, background; press feedback | `--duration-fast` 150ms |
   | Tooltips, small popovers, meters | `--duration-popup` 180ms |
   | List-item entrance | 250-280ms |
   | Drawers, sidebars, dialogs, full-screen menus | `--duration-panel` 240ms |

   UI motion stays under 300ms. Exit is faster than enter.

## Recipes

- **Transition named properties**: `transition: color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)`. `transition: all` animates things you did not intend.
- **Press**: `:active { transform: scale(0.97) }` on buttons and pills; `scale(0.995)` on full-width rows.
- **Entrance**: fade from `opacity: 0; transform: translateY(4px)`. Scale entrances start at 0.95-0.98, never 0.
- **Stagger**: 30-80ms between items (40ms is the default step), only for the first few items, never blocking input.
- **Popovers and tooltips**: ui-sdk popups get `data-starting-style` on the first frame and `data-ending-style` while exiting, and stay mounted until the exit finishes. Style the from/to state on those attributes, and use `transform-origin: var(--transform-origin)`. Placement, flipping (`data-side`) and viewport clamping are ui-sdk's job, so never position in JS. Modals stay centred. Exit faster than enter: shorten `transition-duration` on `[data-ending-style]`.
- **Tooltip timing**: use ui-sdk **Tooltip**. Its built-in grouping replaces the warm window, and it sets `data-instant` on a tooltip that opened at once (the transition is already off for that in `index.css`). Pass `delay={180}` and `closeDelay={80}` for this timing; ui-sdk's default delay is 600ms.
- **Meters and progress**: ui-sdk Meter/Progress set the indicator's `width` inline from the value (also exposed as `--meter-value`/`--progress-value`). Transition that `width` at `--duration-popup`; the indicator is absolutely positioned, so it reflows nothing. Don't add `scale` on top: it compounds with the width.
- **Skeletons**: a gentle opacity pulse (~1.2s) or linear shimmer (~1.5s). Spinners spin fast (~0.8s linear); a faster spinner reads as a faster load.
- **Shared elements**: give an item's title a stable `view-transition-name` on both the list and the detail page so it morphs across navigation.
- **Full-screen mobile menu**: ui-sdk **Drawer** (or Dialog). Exit styles go on `data-ending-style`; ui-sdk keeps it mounted, so no `visibility` toggling.
- **Attention pulse**: reserve a looping glow for the single element that needs action now (a danger state the user can fix).

## Mechanics

- Animate `transform` and `opacity`; sizes, margins and padding trigger layout. A sidebar collapse that must animate width keeps it short (~200ms) and swaps to a `translateX(-100%)` slide on mobile.
- Prefer CSS transitions for anything that can be re-triggered mid-flight: transitions retarget, keyframes restart. Keyframes suit one-shot entrances and loops.
- CSS animations keep running while the main thread is busy; JS-driven animation drops frames during load. Use the Web Animations API when you need programmatic control with CSS performance.
- Changing a custom property on a parent restyles every descendant; for per-frame updates (drag) set `transform` on the moving element itself.
- Keep blur under ~20px; heavy blur is expensive, especially in Safari. A 2px blur during a crossfade blends two states into one.
- For ui-sdk popups use `data-starting-style`. `@starting-style` is only for your own elements.
- Springs suit gestures and interruptible, decorative motion; keep bounce at 0.1-0.3 and leave functional UI on curves.
- Gestures: dismiss on velocity (a quick flick) as well as distance, damp movement past a boundary rather than stopping hard, capture the pointer once dragging starts, and ignore extra touch points mid-drag.

## Gates

- Wrap hover-driven transforms and hover previews in `@media (hover: hover) and (pointer: fine)` (or the same `matchMedia` check in JS) so taps do not trigger them.
- Write transforms (scale, translate), loops, stagger and pulses **inside `@media (prefers-reduced-motion: no-preference)`**. Opacity and colour transitions may sit outside it. Any stylesheet with `transition`/`animation` must contain a `prefers-reduced-motion` block (the style-guard test checks this). Never use a global `* { … !important }` reset.

## Checking motion

Play each animation at 2-5x duration or frame by frame in the DevTools animation panel: origin correct, properties in sync, no double image in crossfades. Look again the next day.
