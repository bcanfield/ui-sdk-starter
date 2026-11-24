import { PANE_TABS } from "./pane-items.ts"
import type { AgentChange, AgentComponent, AgentStep } from "@ui-sdk/react/agent"

// `target` keys the agent trace's anchor. A step with no `steps` is the read step.
type PlanStep = { say: string; target: string; steps?: AgentStep[] }

// Args send values, not labels: a label on a confirm-marked select asks the person twice.
const plan: PlanStep[] = [
  { say: "Read the page", target: "pane" },
  {
    say: "Rename the project",
    target: "name",
    steps: [{ ref: "Project name", action: "setValue", args: ["Apollo API"] }],
  },
  {
    say: "Move it to Frankfurt",
    target: "region",
    steps: [{ ref: "Region", action: "setValue", args: ["frankfurt"] }],
  },
  {
    say: "Scale to 12 replicas",
    target: "replicas",
    steps: [{ ref: "Replicas", action: "setValue", args: [12] }],
  },
  {
    say: "Scale to the maximum instead",
    target: "replicas",
    steps: [{ ref: "Replicas", action: "setValue", args: [10] }],
  },
  {
    say: "Turn on the weekly digest",
    target: "digest",
    steps: [{ ref: "Weekly digest", action: "setChecked", args: [true] }],
  },
  {
    say: "Check the digest is on",
    target: "digest",
    steps: [{ ref: "Weekly digest", action: "expect", args: [true] }],
  },
  {
    say: "Make Apollo public",
    target: "visibility",
    steps: [{ ref: "Visibility", action: "setValue", args: ["public"] }],
  },
]

const READ_CALL = "query({ closed: true })"

function callOf(step: PlanStep) {
  return step.steps ? `act(${JSON.stringify({ steps: step.steps })})` : READ_CALL
}

const isControl = (entry: AgentComponent) => entry.component !== "more"

function describeRead(
  closed: AgentComponent[] | { error: string },
  shown: AgentComponent[],
  inPane: (entry: AgentComponent) => boolean
) {
  if (Array.isArray(closed)) {
    const controls = closed.filter((entry) => isControl(entry) && inPane(entry))
    const token = controls.find((entry) => entry.label === "Deploy token")
    if (token?.value === "[redacted]") {
      return `Read ${controls.length} controls. Deploy token is redacted.`
    }
  }
  const onTab = shown.filter((entry) => isControl(entry) && !entry.offPage && inPane(entry))
  const behind = Array.isArray(closed)
    ? closed.filter((entry) => isControl(entry) && inPane(entry)).length - onTab.length
    : 0
  return behind > 0
    ? `Read ${onTab.length} controls on General; ${behind} more behind Notifications.`
    : `Read ${onTab.length} controls on General.`
}

function describeChanges(changes: AgentChange[]) {
  return changes
    .filter((change) => change.label !== PANE_TABS)
    .map((change) => `${change.label ?? change.component} ${change.key} → ${JSON.stringify(change.value)}`)
    .join(", ")
}

export { callOf, describeChanges, describeRead, plan, type PlanStep }
