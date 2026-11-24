import { overlays } from "@ui-sdk/react/overlays"
import { useEffect, useRef, useState, type RefObject } from "react"
import { agent } from "../agent.ts"
import { inPane } from "./pane-scope.ts"
import { describeChanges, describeRead, plan } from "./plan.ts"

type StepState = "idle" | "running" | "waiting" | "done" | "refused"
type Row = { state: StepState; note?: string }
type Pacing = { leadIn: number; between: number }

const defaultPacing: Pacing = { leadIn: 260, between: 700 }

const idleRows = (): Row[] => plan.map(() => ({ state: "idle" }))

function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(done, ms)
    signal.addEventListener("abort", done, { once: true })
    function done() {
      clearTimeout(timer)
      signal.removeEventListener("abort", done)
      resolve()
    }
  })
}

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

const isConfirmOpen = () => overlays.entries().some((entry) => entry.type === "confirm")

function usePlanPlayer(pacing: Pacing, paneRoot: RefObject<HTMLElement | null>) {
  const [rows, setRows] = useState(idleRows)
  const [next, setNext] = useState(0)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState("")
  const [paneKey, setPaneKey] = useState(0)
  const nextRef = useRef(0)
  const current = useRef(-1)
  const abort = useRef<AbortController | null>(null)
  const runId = useRef(0)
  const latest = useRef(rows)

  function updateRows(update: (all: Row[]) => Row[]) {
    latest.current = update(latest.current)
    setRows(latest.current)
  }

  function setRow(index: number, row: Row) {
    updateRows((all) => all.map((old, i) => (i === index ? row : old)))
  }

  function advance(to: number) {
    nextRef.current = to
    setNext(to)
  }

  // The shell's bridge asks through `confirm()`; its overlay entry is how the player knows a step waits on a person.
  useEffect(
    () =>
      overlays.subscribe(() => {
        const index = current.current
        if (index < 0) return
        const state = isConfirmOpen() ? "waiting" : "running"
        updateRows((all) =>
          all.map((row, i) =>
            i === index && (row.state === "running" || row.state === "waiting") ? { state } : row
          )
        )
      }),
    []
  )

  async function runStep(index: number, signal: AbortSignal, id: number) {
    const step = plan[index]!
    current.current = index
    setRow(index, { state: "running" })
    await pause(reducedMotion() ? 0 : pacing.leadIn, signal)
    if (signal.aborted) return stopped(index, id)

    if (!step.steps) {
      const closed = await agent.query({ closed: true })
      if (id !== runId.current) return false
      setRow(index, { state: "done", note: describeRead(closed, agent.snapshot(), (entry) =>
          inPane(paneRoot, entry)
        ),
      })
      return finish(index, id)
    }

    const outcome = await agent.act({ steps: step.steps }, { signal })
    if (id !== runId.current) return false
    if (signal.aborted) return stopped(index, id)
    if (outcome.ok) {
      const changes = describeChanges(outcome.steps.flatMap((s) => s.changes ?? []))
      setRow(index, { state: "done", note: changes || "Holds." })
    } else {
      setRow(index, { state: "refused", note: outcome.error?.message })
    }
    return finish(index, id)
  }

  function finish(index: number, id: number) {
    if (id !== runId.current) return false
    current.current = -1
    advance(index + 1)
    return true
  }

  function stopped(index: number, id: number) {
    if (id === runId.current) {
      current.current = -1
      setRow(index, { state: "idle", note: "Stopped before it applied." })
    }
    return false
  }

  async function play(steps: number) {
    const controller = new AbortController()
    abort.current = controller
    const id = runId.current
    setRunning(true)
    setResult("")
    let played = 0
    while (played < steps && nextRef.current < plan.length && !controller.signal.aborted) {
      if (played > 0) await pause(pacing.between, controller.signal)
      if (controller.signal.aborted) break
      const ok = await runStep(nextRef.current, controller.signal, id)
      if (!ok) break
      played++
    }
    if (id !== runId.current) return
    setRunning(false)
    abort.current = null
    if (nextRef.current >= plan.length) setResult(summarise(latest.current))
  }

  function stop() {
    abort.current?.abort()
  }

  function reset() {
    stop()
    runId.current++
    current.current = -1
    abort.current = null
    advance(0)
    setRunning(false)
    updateRows(idleRows)
    setResult("")
    setPaneKey((key) => key + 1)
  }

  return {
    rows,
    running,
    finished: next >= plan.length,
    result,
    paneKey,
    run: () => play(plan.length),
    step: () => play(1),
    stop,
    reset,
  }
}

function summarise(rows: Row[]) {
  const last = rows.at(-1)
  if (last?.state === "refused" && last.note?.includes("said no")) {
    return "You refused Visibility. The steps before it stay applied: nothing rolls back."
  }
  const done = rows.filter((row) => row.state === "done").length
  const refused = rows.filter((row) => row.state === "refused").length
  return `Run finished: ${done} steps done, ${refused} refused.`
}

export { defaultPacing, usePlanPlayer, type Pacing, type StepState }
