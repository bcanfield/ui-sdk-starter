import { isTabSwitch, LABELS } from "./pane-items.ts"
import type { AgentChange, AgentComponent, AgentStep } from "@ui-sdk/react/agent"

// `target` keys the agent trace's anchor. A step with no `steps` is the read step.
type PlanStep = { say: string; target: string; steps?: AgentStep[] }

type StepState = "idle" | "running" | "waiting" | "done" | "refused"

const STEP_STATUS: Record<StepState, string> = {
  idle: "ready",
  running: "running",
  waiting: "needs you",
  done: "done",
  refused: "refused",
}

// Args send values, not labels: a label on a confirm-marked select asks the person twice.
const plan: PlanStep[] = [
  { say: "Read the page", target: "pane" },
  {
    say: "Rename the project",
    target: "name",
    steps: [{ ref: LABELS.name, action: "setValue", args: ["Apollo API"] }],
  },
  {
    say: "Move it to Frankfurt",
    target: "region",
    steps: [{ ref: LABELS.region, action: "setValue", args: ["frankfurt"] }],
  },
  {
    say: "Scale to 12 replicas",
    target: "replicas",
    steps: [{ ref: LABELS.replicas, action: "setValue", args: [12] }],
  },
  {
    say: "Scale to the maximum instead",
    target: "replicas",
    steps: [{ ref: LABELS.replicas, action: "setValue", args: [10] }],
  },
  {
    say: "Give it a mark",
    target: "mark",
    steps: [{ ref: LABELS.mark, action: "setValue", args: ["rocket"] }],
  },
  {
    say: "Turn on the weekly digest",
    target: "digest",
    steps: [{ ref: LABELS.digest, action: "setChecked", args: [true] }],
  },
  {
    say: "Check the digest is on",
    target: "digest",
    steps: [{ ref: LABELS.digest, action: "expect", args: [true] }],
  },
  {
    say: "Make Apollo public",
    target: "visibility",
    steps: [{ ref: LABELS.visibility, action: "setValue", args: ["public"] }],
  },
]

const TASK = "Move Apollo to Frankfurt, scale it, give it a mark and make it public"

const READ_CALL = "query({ closed: true })"

const controlOf = (step: PlanStep) => step.steps?.[0]?.ref ?? step.say

function callOf(step: PlanStep) {
  return step.steps ? `act(${JSON.stringify({ steps: step.steps })})` : READ_CALL
}

const isControl = (entry: AgentComponent) => entry.component !== "more"

function describeRead(
  closed: AgentComponent[] | { error: string },
  shown: AgentComponent[],
  inPane: (entry: AgentComponent) => boolean
) {
  const paneControls = (entries: AgentComponent[]) =>
    entries.filter((entry) => isControl(entry) && inPane(entry))
  const all = Array.isArray(closed) ? paneControls(closed) : null
  const token = all?.find((entry) => entry.label === LABELS.token)
  if (all && token?.value === "[redacted]") {
    return `Read ${all.length} controls. ${LABELS.token} is redacted.`
  }
  const onTab = paneControls(shown).filter((entry) => !entry.offPage)
  const behind = all ? all.length - onTab.length : 0
  return behind > 0
    ? `Read ${onTab.length} controls on ${LABELS.general}; ${behind} more behind ${LABELS.notifications}.`
    : `Read ${onTab.length} controls on ${LABELS.general}.`
}

function describeChanges(changes: AgentChange[]) {
  return changes
    .filter((change) => !isTabSwitch(change))
    .map((change) => `${change.label ?? change.component} ${change.key} → ${JSON.stringify(change.value)}`)
    .join(", ")
}

function describeOutcome(outcome: { steps: { changes?: AgentChange[] }[] }) {
  return describeChanges(outcome.steps.flatMap((step) => step.changes ?? [])) || "Holds."
}

export { callOf, controlOf, describeOutcome, describeRead, plan, STEP_STATUS, TASK, type StepState }
