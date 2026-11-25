import { colorScheme } from "./color-scheme.ts"

function syncThemeColor() {
  requestAnimationFrame(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", getComputedStyle(document.body).backgroundColor)
  })
}

syncThemeColor()
colorScheme.subscribe(syncThemeColor)
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncThemeColor)
