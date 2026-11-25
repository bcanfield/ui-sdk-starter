import { overlays } from "@ui-sdk/react/overlays"
import { useEffect, useRef, useState, type RefObject } from "react"
import { agent, onAnswer } from "../agent.ts"
import { reducedMotion } from "./motion.ts"
import { inPane } from "./pane-scope.ts"
import { controlOf, describeOutcome, describeRead, plan, type StepState } from "./plan.ts"
import type { BridgeLock } from "./use-bridge-lock.ts"

type Row = { state: StepState; note?: string; refusedBy?: "person" }
type Pacing = { leadIn: number; between: number }
type Trace = { place: (target: string, options?: { asking?: boolean }) => void }
type StepRun = { index: number; signal: AbortSignal; id: number }

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

const isConfirmOpen = () => overlays.entries().some((entry) => entry.type === "confirm")

function usePlanPlayer(
  pacing: Pacing,
  runGrid: RefObject<HTMLElement | null>,
  { trace, onReset, lock }: { trace: Trace; onReset: () => void; lock: BridgeLock }
) {
  const [rows, setRows] = useState(idleRows)
  const [next, setNext] = useState(0)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState("")
  const [paneKey, setPaneKey] = useState(0)
  const [active, setActive] = useState(-1)
  const traceRef = useRef(trace)
  useEffect(() => {
    traceRef.current = trace
  })
  const nextRef = useRef(0)
  const runningIndex = useRef(-1)
  const personSaidNo = useRef(false)
  const abort = useRef<AbortController | null>(null)
  const runId = useRef(0)
  const latestRows = useRef(rows)

  function updateRows(update: (all: Row[]) => Row[]) {
    latestRows.current = update(latestRows.current)
    setRows(latestRows.current)
  }

  function setRow(index: number, row: Row) {
    updateRows((all) => all.map((old, i) => (i === index ? row : old)))
  }

  function advance(to: number) {
    nextRef.current = to
    setNext(to)
  }

  // The shell's bridge asks through `confirm()`; its overlay entry is how the player knows a step waits on a person.
  useEffect(() => {
    let frame = 0
    const stop = overlays.subscribe(() => {
      const index = runningIndex.current
      if (index < 0) return
      const state = isConfirmOpen() ? "waiting" : "running"
      // The bridge has just switched to the control's tab; place the trace once that has painted.
      if (state === "waiting") {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => traceRef.current.place(plan[index]!.target, { asking: true }))
      }
      updateRows((all) =>
        all.map((row, i) =>
          i === index && (row.state === "running" || row.state === "waiting") ? { state } : row
        )
      )
    })
    return () => {
      stop()
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(
    () =>
      onAnswer(({ allowed }) => {
        if (runningIndex.current >= 0 && !allowed) personSaidNo.current = true
      }),
    []
  )

  // Leaving mid-run aborts the step, which also closes a pending confirm and frees the bridge's queue.
  useEffect(
    () => () => {
      abort.current?.abort()
      runId.current++
    },
    []
  )

  async function runStep(run: StepRun) {
    const { index, signal } = run
    const step = plan[index]!
    runningIndex.current = index
    personSaidNo.current = false
    setActive(index)
    setRow(index, { state: "running" })
    traceRef.current.place(step.target)
    await pause(reducedMotion() ? 0 : pacing.leadIn, signal)
    if (signal.aborted) return stopped(run)

    if (!step.steps) {
      const closed = await agent.query({ closed: true })
      if (run.id !== runId.current) return false
      if (signal.aborted) return stopped(run)
      setRow(index, {
        state: "done",
        note: describeRead(closed, agent.snapshot(), (entry) => inPane(runGrid, entry)),
      })
      return finish(run)
    }

    const outcome = await agent.act({ steps: step.steps }, { signal })
    if (run.id !== runId.current) return false
    // A stop can land after the bridge applied the value; the row then says so, and the cursor moves past it.
    if (outcome.ok) {
      traceRef.current.place(step.target)
      setRow(index, { state: "done", note: describeOutcome(outcome) })
      return finish(run)
    }
    if (signal.aborted) return stopped(run)
    traceRef.current.place(step.target)
    setRow(index, {
      state: "refused",
      note: outcome.error?.message,
      refusedBy: personSaidNo.current ? "person" : undefined,
    })
    return finish(run)
  }

  function finish({ index, id }: StepRun) {
    if (id !== runId.current) return false
    runningIndex.current = -1
    advance(index + 1)
    return true
  }

  function stopped({ index, id }: StepRun) {
    if (id === runId.current) {
      runningIndex.current = -1
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
      // Reading time between steps, not motion, so it stays under reduced motion.
      if (played > 0) await pause(pacing.between, controller.signal)
      if (controller.signal.aborted) break
      const ok = await runStep({ index: nextRef.current, signal: controller.signal, id })
      if (!ok) break
      played++
    }
    if (id !== runId.current) return
    setRunning(false)
    abort.current = null
    if (nextRef.current >= plan.length) setResult(summarise(latestRows.current))
  }

  function stop() {
    abort.current?.abort()
  }

  function reset() {
    stop()
    runId.current++
    runningIndex.current = -1
    abort.current = null
    advance(0)
    setActive(-1)
    setRunning(false)
    updateRows(idleRows)
    setResult("")
    setPaneKey((key) => key + 1)
    onReset()
  }

  return {
    rows,
    active,
    running,
    tracing: running && active >= 0,
    result,
    paneKey,
    blocked: next >= plan.length || lock.busy,
    // Only the plan's run takes a signal; Reset waits on undo or an own step rather than remount the pane under it.
    canReset: !lock.busy || lock.holder === "plan",
    run: () => lock.hold("plan", () => play(plan.length)),
    step: () => lock.hold("plan", () => play(1)),
    stop,
    reset,
  }
}

type PlanPlayer = ReturnType<typeof usePlanPlayer>

function summarise(rows: Row[]) {
  const last = rows.at(-1)
  if (last?.state === "refused" && last.refusedBy === "person") {
    return `You refused ${controlOf(plan.at(-1)!)}. The steps before it stay applied: nothing rolls back.`
  }
  const done = rows.filter((row) => row.state === "done").length
  const refused = rows.filter((row) => row.state === "refused").length
  return `Run finished: ${done} steps done, ${refused} refused.`
}

export { defaultPacing, usePlanPlayer, type Pacing, type PlanPlayer }
