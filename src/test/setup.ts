import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

declare global {
  var __UI_SDK_STRICT__: boolean | undefined
}
globalThis.__UI_SDK_STRICT__ = true

HTMLElement.prototype.showPopover = function () {}
HTMLElement.prototype.hidePopover = function () {}
Element.prototype.getAnimations = () => []
Element.prototype.scrollIntoView = function () {}
// As in a browser, content under `hidden` (a closed tab panel) isn't visible, so the bridge has to open its tab.
Element.prototype.checkVisibility = function (this: Element) {
  return !this.closest("[hidden]")
}
Element.prototype.getClientRects = () => [] as unknown as DOMRectList
document.elementFromPoint = () => null
document.elementsFromPoint = () => []
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Frames as in a browser: callbacks queued before a frame run together, ones queued during it wait for the
// next, and a cancelled one never runs. jsdom paints nothing, so a frame comes on the next timer, not every 16ms.
let frame = new Map<number, FrameRequestCallback>()
let frameTimer: ReturnType<typeof setTimeout> | undefined
let frameId = 0
globalThis.requestAnimationFrame = (callback) => {
  frame.set(++frameId, callback)
  frameTimer ??= setTimeout(() => {
    const due = frame
    frame = new Map()
    frameTimer = undefined
    const now = performance.now()
    for (const run of due.values()) run(now)
  }, 0)
  return frameId
}
globalThis.cancelAnimationFrame = (handle) => {
  frame.delete(handle)
}

document.head.append(
  Object.assign(document.createElement("style"), {
    textContent: "[popover] { display: block !important }",
  })
)

afterEach(cleanup)
