import { createHistory, type HistoryEntry } from "@ui-sdk/react/history"
import { useEffect, useRef, useState, type RefObject } from "react"
import { agent } from "../agent.ts"
import { itemLabel, PANE_TABS } from "./pane-items.ts"

type LogEntry = { id: string; source: "agent" | "you"; text: string; reverted: boolean }
type Missed = { ref: string; key: string }

const UNDONE = "Agent's changes undone. Yours stayed."

function valueText(entry: HistoryEntry) {
  if (entry.redacted) return "redacted"
  if (typeof entry.value === "boolean") return entry.value ? "on" : "off"
  return itemLabel(entry.label, entry.value) ?? String(entry.value)
}

function toLogEntry(entry: HistoryEntry): LogEntry {
  return {
    id: entry.id,
    source: entry.source === "agent" ? "agent" : "you",
    text: `${entry.label} → ${valueText(entry)}`,
    reverted: Boolean(entry.reverted),
  }
}

function describeMissed(missed: Missed[], entries: readonly HistoryEntry[]) {
  const named = missed.map((m) => {
    const label = entries.find((entry) => entry.ref === m.ref)?.label
    return label ? `${label} (${m.ref}) ${m.key}` : `${m.ref} ${m.key}`
  })
  return `Couldn't put back: ${named.join(", ")}`
}

// Tab switches are the bridge reaching behind a closed tab, not edits a person made or the plan asked for.
const isTabSwitch = (entry: HistoryEntry) => entry.label === PANE_TABS

function usePaneHistory(paneRoot: RefObject<HTMLElement | null>, paneKey: number) {
  const history = useRef<ReturnType<typeof createHistory> | null>(null)
  const [entries, setEntries] = useState<readonly HistoryEntry[]>([])
  const [undoing, setUndoing] = useState(false)
  const [result, setResult] = useState("")

  useEffect(() => {
    const recorder = createHistory(agent, {
      within: () => paneRoot.current?.querySelector("[data-pane]"),
    })
    history.current = recorder
    const stop = recorder.subscribe(() => setEntries([...recorder.entries()]))
    return () => {
      stop()
      recorder.destroy()
      history.current = null
    }
  }, [paneRoot])

  const firstKey = useRef(paneKey)
  useEffect(() => {
    if (paneKey === firstKey.current) return
    history.current?.clear()
    setEntries([])
    setResult("")
  }, [paneKey])

  async function undoAgent() {
    const recorder = history.current
    if (!recorder) return
    setUndoing(true)
    setResult("")
    const missed = await recorder.undoSource("agent")
    if (history.current !== recorder) return
    setUndoing(false)
    setResult(missed.length ? describeMissed(missed, recorder.entries()) : UNDONE)
  }

  const shown = entries.filter((entry) => !isTabSwitch(entry))
  return {
    log: shown.map(toLogEntry),
    canUndo: !undoing && shown.some((entry) => entry.source === "agent" && !entry.reverted),
    undoing,
    result,
    undoAgent,
  }
}

export { usePaneHistory, type LogEntry }
