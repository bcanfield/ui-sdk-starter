import { elementOf } from "@ui-sdk/react/observe"
import type { RefObject } from "react"

const paneIn = (runGrid: RefObject<HTMLElement | null>) =>
  runGrid.current?.querySelector<HTMLElement>("[data-pane]") ?? null

// An off-page ref has no element and counts as outside the pane.
function inPane(runGrid: RefObject<HTMLElement | null>, entry: { ref: string }) {
  const pane = paneIn(runGrid)
  const element = elementOf(entry.ref) as HTMLElement | undefined
  return Boolean(pane && element && pane.contains(element))
}

export { inPane, paneIn }
