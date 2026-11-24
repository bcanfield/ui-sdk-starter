import { elementOf } from "@ui-sdk/react/observe"
import type { RefObject } from "react"

// An off-page ref has no element and counts as outside the pane.
function inPane(paneRoot: RefObject<HTMLElement | null>, entry: { ref: string }) {
  const pane = paneRoot.current?.querySelector("[data-pane]")
  const element = elementOf(entry.ref) as HTMLElement | undefined
  return Boolean(pane && element && pane.contains(element))
}

export { inPane }
