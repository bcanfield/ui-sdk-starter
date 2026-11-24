import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OverlayHost } from "@ui-sdk/react/overlays"
import { expect, test } from "vitest"
import { agent } from "../agent.ts"
import { AgentRunSection } from "./agent-run-section.tsx"

const SAY = [
  "Read the page",
  "Rename the project",
  "Move it to Frankfurt",
  "Scale to 12 replicas",
  "Scale to the maximum instead",
  "Turn on the weekly digest",
  "Check the digest is on",
  "Make Apollo public",
] as const

function renderRun() {
  const user = userEvent.setup()
  render(
    <>
      <AgentRunSection pacing={{ leadIn: 0, between: 0 }} />
      <OverlayHost />
    </>
  )
  return user
}

const rows = () => within(screen.getByRole("list", { name: "Plan" })).getAllByRole("listitem")
const row = (say: (typeof SAY)[number]) => rows()[SAY.indexOf(say)]!
const stateOf = (say: (typeof SAY)[number]) =>
  within(row(say)).getByTestId("step-state").textContent
const states = () => SAY.map((say) => stateOf(say))
const press = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole("button", { name }))

const pane = {
  name: () => screen.getByLabelText("Project name"),
  region: () => screen.getByRole("combobox", { name: "Region" }),
  replicas: () => screen.getByRole("textbox", { name: "Replicas" }),
  digest: () => screen.getByRole("switch", { name: "Weekly digest", hidden: true }),
  visibility: () => screen.getByRole("combobox", { name: "Visibility" }),
}

async function step(user: ReturnType<typeof userEvent.setup>) {
  await press(user, "Step")
  await waitFor(() => expect(screen.getByRole("button", { name: "Stop" })).toBeDisabled())
}

async function runToGate(user: ReturnType<typeof userEvent.setup>) {
  await press(user, "Run")
  await waitFor(() => expect(stateOf("Make Apollo public")).toBe("waiting"))
  return screen.getByRole("alertdialog", { name: "Let the agent continue?" })
}

test("the plan lists eight steps, each with its literal call, all idle", () => {
  renderRun()
  expect(rows()).toHaveLength(8)
  expect(states()).toEqual(Array(8).fill("idle"))
  expect(row("Read the page")).toHaveTextContent("query({ closed: true })")
  expect(row("Move it to Frankfurt")).toHaveTextContent(
    'act({"steps":[{"ref":"Region","action":"setValue","args":["frankfurt"]}]})'
  )
  expect(row("Make Apollo public")).toHaveTextContent('"args":["public"]')
})

test("Step reads the page and narrates what the query returned", async () => {
  const user = renderRun()
  await press(user, "Step")
  await waitFor(() => expect(stateOf("Read the page")).toBe("done"))
  expect(row("Read the page")).toHaveTextContent(
    "Read 7 controls. Deploy token is redacted."
  )
  expect(stateOf("Rename the project")).toBe("idle")
})

test("a full run with Allow: every step's state and the final values", async () => {
  const user = renderRun()
  const ask = await runToGate(user)
  expect(ask).toHaveAccessibleDescription("Changes who can see Apollo")
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await waitFor(() => expect(stateOf("Make Apollo public")).toBe("done"))

  expect(states()).toEqual([
    "done",
    "done",
    "done",
    "refused",
    "done",
    "done",
    "done",
    "done",
  ])
  expect(row("Rename the project")).toHaveTextContent('Project name value → "Apollo API"')
  expect(row("Make Apollo public")).toHaveTextContent('Visibility value → "public"')
  expect(pane.name()).toHaveValue("Apollo API")
  expect(pane.region()).toHaveTextContent("Frankfurt")
  expect(pane.replicas()).toHaveValue("10")
  expect(pane.digest()).toBeChecked()
  expect(pane.visibility()).toHaveTextContent("Public")
  expect(screen.getByRole("status", { name: "Run result" })).toHaveTextContent(
    "7 steps done, 1 refused"
  )
})

test("Replicas 12 is refused with the bridge's words, and Replicas holds until step 5", async () => {
  const user = renderRun()
  for (let i = 0; i < 4; i++) await step(user)
  await waitFor(() => expect(stateOf("Scale to 12 replicas")).toBe("refused"))
  expect(
    within(row("Scale to 12 replicas")).getByText(
      /^setValue on Replicas \(c\d+\) takes a number from 1 to 10, not 12\.$/
    )
  ).toBeInTheDocument()
  expect(pane.replicas()).toHaveValue("2")

  await step(user)
  expect(stateOf("Scale to the maximum instead")).toBe("done")
  expect(pane.replicas()).toHaveValue("10")
})

test("Refuse at the gate: earlier values stay applied, and the console says so", async () => {
  const user = renderRun()
  const ask = await runToGate(user)
  await user.click(within(ask).getByRole("button", { name: "Refuse" }))
  await waitFor(() => expect(stateOf("Make Apollo public")).toBe("refused"))

  expect(row("Make Apollo public")).toHaveTextContent(
    'The person said no to "Changes who can see Apollo".'
  )
  expect(pane.visibility()).toHaveTextContent("Private")
  expect(pane.name()).toHaveValue("Apollo API")
  expect(pane.region()).toHaveTextContent("Frankfurt")
  expect(pane.replicas()).toHaveValue("10")
  expect(pane.digest()).toBeChecked()
  expect(screen.getByRole("status", { name: "Run result" })).toHaveTextContent(
    "You refused Visibility. The steps before it stay applied: nothing rolls back."
  )
})

test("Stop while waiting at the gate closes the dialog and leaves the step not applied", async () => {
  const user = renderRun()
  await runToGate(user)
  // The modal dialog takes a person's pointer, so user-event can't reach Stop; this dispatches its click directly.
  fireEvent.click(screen.getByRole("button", { name: "Stop" }))
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
  await waitFor(() => expect(stateOf("Make Apollo public")).toBe("idle"))
  expect(row("Make Apollo public")).toHaveTextContent("Stopped before it applied.")
  expect(pane.visibility()).toHaveTextContent("Private")
  expect(screen.getByRole("button", { name: "Run" })).toBeEnabled()
})

test("Reset restores the defaults and clears every step", async () => {
  const user = renderRun()
  const ask = await runToGate(user)
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await waitFor(() => expect(stateOf("Make Apollo public")).toBe("done"))

  await press(user, "Reset")
  expect(states()).toEqual(Array(8).fill("idle"))
  expect(pane.name()).toHaveValue("Apollo")
  expect(pane.region()).toHaveTextContent("Virginia")
  expect(pane.replicas()).toHaveValue("2")
  expect(pane.digest()).not.toBeChecked()
  expect(pane.visibility()).toHaveTextContent("Private")
  expect(screen.getByRole("status", { name: "Run result" })).toBeEmptyDOMElement()
  expect(screen.getByRole("button", { name: "Run" })).toBeEnabled()
})

test("the agent is the bridge the plan drives", async () => {
  const user = renderRun()
  await step(user)
  await step(user)
  expect(stateOf("Rename the project")).toBe("done")
  const name = agent.snapshot().find((entry) => entry.label === "Project name")
  expect(name?.value).toBe("Apollo API")
})
