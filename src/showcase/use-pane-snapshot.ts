import type { AgentComponent } from "@ui-sdk/react/agent"
import { useEffect, useState, type RefObject } from "react"
import { agent } from "../agent.ts"
import { inPane } from "./pane-scope.ts"

function usePaneSnapshot(paneRoot: RefObject<HTMLElement | null>, paneKey: number, active: boolean) {
  const [entries, setEntries] = useState<AgentComponent[]>([])
  useEffect(() => {
    // Only the Snapshot tab shows it, and every read scans the page, so read only while it is open.
    if (!active) return
    const read = () =>
      setEntries(agent.snapshot().filter((entry) => inPane(paneRoot, entry)))
    read()
    // A change is reported before React commits it: after a tab switch the new panel is still hidden.
    let frame = 0
    const stop = agent.subscribe(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(read)
    })
    return () => {
      stop()
      cancelAnimationFrame(frame)
    }
  }, [paneRoot, paneKey, active])
  return entries
}

export { usePaneSnapshot }
