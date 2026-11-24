import { createHistory, type HistoryEntry } from "@ui-sdk/react/history"
import { useEffect, useRef, useState, type RefObject } from "react"
import { agent } from "../agent.ts"
import { itemLabel, PANE_TABS } from "./pane-items.ts"

type LogEntry = { id: string; source: "agent" | "you"; text: string; reverted: boolean }
type Missed = { ref: string; key: string }

type UndoResult = { text: string; title?: string }

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
  const labelOf = (m: Missed) =>
    entries.find((entry) => entry.ref === m.ref)?.label ?? "a control"
  const labels = [...new Set(missed.map(labelOf))]
  const detail = missed.map((m) => `${labelOf(m)} (${m.ref}) ${m.key}`)
  return { text: `Couldn't put back: ${labels.join(", ")}`, title: detail.join(", ") }
}

// Tab switches are the bridge reaching behind a closed tab, not edits a person made or the plan asked for.
const isTabSwitch = (entry: HistoryEntry) => entry.label === PANE_TABS

function usePaneHistory(paneRoot: RefObject<HTMLElement | null>, paneKey: number) {
  const history = useRef<ReturnType<typeof createHistory> | null>(null)
  const [entries, setEntries] = useState<readonly HistoryEntry[]>([])
  const [undoing, setUndoing] = useState(false)
  const [result, setResult] = useState<UndoResult>({ text: "" })

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
    setResult({ text: "" })
  }, [paneKey])

  async function undoAgent() {
    const recorder = history.current
    if (!recorder) return
    setUndoing(true)
    setResult({ text: "" })
    const missed = await recorder.undoSource("agent")
    if (history.current !== recorder) return
    setUndoing(false)
    setResult(missed.length ? describeMissed(missed, recorder.entries()) : { text: UNDONE })
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
