import { colorScheme } from "./color-scheme.ts"

function syncThemeColor() {
  requestAnimationFrame(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", getComputedStyle(document.body).backgroundColor)
  })
}

syncThemeColor()
// subscribe also fires when the OS scheme flips while the choice is "system".
colorScheme.subscribe(syncThemeColor)
