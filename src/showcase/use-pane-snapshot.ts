import type { AgentComponent } from "@ui-sdk/react/agent"
import { useEffect, useState, type RefObject } from "react"
import { agent } from "../agent.ts"
import { inPane } from "./pane-scope.ts"

function usePaneSnapshot(paneRoot: RefObject<HTMLElement | null>, paneKey: number) {
  const [entries, setEntries] = useState<AgentComponent[]>([])
  useEffect(() => {
    const read = () =>
      setEntries(agent.snapshot().filter((entry) => inPane(paneRoot, entry)))
    read()
    return agent.subscribe(read)
  }, [paneRoot, paneKey])
  return entries
}

export { usePaneSnapshot }
