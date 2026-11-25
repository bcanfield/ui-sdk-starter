import { createHistory, type HistoryEntry } from "@ui-sdk/react/history"
import { useEffect, useRef, useState, type RefObject } from "react"
import { agent } from "../agent.ts"
import { messageOf } from "./message-of.ts"
import { isTabSwitch, itemLabel } from "./pane-items.ts"
import { paneIn } from "./pane-scope.ts"
import type { BridgeLock } from "./use-bridge-lock.ts"

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

function usePaneHistory(runGrid: RefObject<HTMLElement | null>, lock: BridgeLock) {
  const history = useRef<ReturnType<typeof createHistory> | null>(null)
  const [entries, setEntries] = useState<readonly HistoryEntry[]>([])
  const [result, setResult] = useState<UndoResult>({ text: "" })
  const generation = useRef(0)

  useEffect(() => {
    const recorder = createHistory(agent, {
      within: () => paneIn(runGrid),
    })
    history.current = recorder
    const stop = recorder.subscribe(() => setEntries([...recorder.entries()]))
    return () => {
      stop()
      recorder.destroy()
      history.current = null
    }
  }, [runGrid])

  function clear() {
    generation.current++
    history.current?.clear()
    setEntries([])
    setResult({ text: "" })
  }

  function undoAgent() {
    const recorder = history.current
    if (!recorder) return
    return lock.hold("undo", async () => {
      const started = ++generation.current
      setResult({ text: "" })
      let outcome: UndoResult
      try {
        const missed = await recorder.undoSource("agent")
        outcome = missed.length ? describeMissed(missed, recorder.entries()) : { text: UNDONE }
      } catch (error) {
        outcome = { text: `Couldn't undo the agent: ${messageOf(error)}` }
      }
      if (history.current !== recorder || generation.current !== started) return
      setResult(outcome)
    })
  }

  const shown = entries.filter((entry) => !isTabSwitch(entry))
  return {
    log: shown.map(toLogEntry),
    canUndo: !lock.busy && shown.some((entry) => entry.source === "agent" && !entry.reverted),
    result,
    undoAgent,
    clear,
  }
}

export { usePaneHistory }
