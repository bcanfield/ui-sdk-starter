import { screen, within } from "@testing-library/react"
import { overlays } from "@ui-sdk/react/overlays"
import { afterEach, expect, test, vi } from "vitest"
import { agent } from "../agent.ts"
import { gate, gateClosed, press, renderRun, until, type User } from "./run-kit.tsx"

afterEach(() => vi.restoreAllMocks())

const SAY = [
  "Read the page",
  "Rename the project",
  "Move it to Frankfurt",
  "Scale to 12 replicas",
  "Scale to the maximum instead",
  "Give it a mark",
  "Turn on the weekly digest",
  "Check the digest is on",
  "Make Apollo public",
] as const

const rows = () => within(screen.getByRole("list", { name: "Plan" })).getAllByRole("listitem")
const row = (say: (typeof SAY)[number]) => rows()[SAY.indexOf(say)]!
const stateOf = (say: (typeof SAY)[number]) => row(say).dataset.state
const states = () => SAY.map((say) => stateOf(say))
const stateIs = (say: (typeof SAY)[number], state: string) =>
  until(() => expect(stateOf(say)).toBe(state))
const idle = () => until(() => expect(screen.getByRole("button", { name: "Stop" })).toBeDisabled())

const pane = {
  name: () => screen.getByLabelText("Project name"),
  region: () => screen.getByRole("combobox", { name: "Region" }),
  replicas: () => screen.getByRole("textbox", { name: "Replicas" }),
  digest: () => screen.getByRole("switch", { name: "Weekly digest", hidden: true }),
  mark: () => within(screen.getByRole("group", { name: "Project mark" })).getByRole("button"),
  visibility: () => screen.getByRole("combobox", { name: "Visibility" }),
}

async function step(user: User) {
  await press(user, "Step")
  await idle()
}

async function runToGate(user: User) {
  await press(user, "Run")
  const ask = await gate()
  await stateIs("Make Apollo public", "waiting")
  return ask
}

test("the plan lists nine steps, each with its literal call, all ready", () => {
  renderRun()
  expect(rows()).toHaveLength(9)
  expect(states()).toEqual(Array(9).fill("idle"))
  for (const item of rows()) expect(item).toHaveTextContent(/ready$/)
  expect(row("Read the page")).toHaveTextContent("query({ closed: true })")
  expect(row("Move it to Frankfurt")).toHaveTextContent(
    'act({"steps":[{"ref":"Region","action":"setValue","args":["frankfurt"]}]})'
  )
  expect(row("Give it a mark")).toHaveTextContent(
    'act({"steps":[{"ref":"Project mark","action":"setValue","args":["rocket"]}]})'
  )
  expect(row("Make Apollo public")).toHaveTextContent('"args":["public"]')
})

test("Step reads the page and narrates what the query returned", async () => {
  const { user } = renderRun()
  await step(user)
  expect(stateOf("Read the page")).toBe("done")
  expect(row("Read the page")).toHaveTextContent("Read 8 controls. Deploy token is redacted.")
  expect(stateOf("Rename the project")).toBe("idle")
})

test("a full run with Allow: every step's state and the final values", async () => {
  const { user } = renderRun()
  const ask = await runToGate(user)
  expect(ask).toHaveAccessibleDescription("Changes who can see Apollo")
  expect(row("Make Apollo public")).toHaveTextContent(/needs you$/)
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await stateIs("Make Apollo public", "done")

  expect(states()).toEqual(["done", "done", "done", "refused", "done", "done", "done", "done", "done"])
  expect(row("Rename the project")).toHaveTextContent('Project name value → "Apollo API"')
  expect(row("Give it a mark")).toHaveTextContent('Project mark value → "rocket"')
  expect(row("Make Apollo public")).toHaveTextContent('Visibility value → "public"')
  expect(pane.name()).toHaveValue("Apollo API")
  expect(pane.region()).toHaveTextContent("Frankfurt")
  expect(pane.replicas()).toHaveValue("10")
  expect(pane.digest()).toBeChecked()
  expect(pane.mark()).toHaveTextContent("Rocket")
  expect(pane.visibility()).toHaveTextContent("Public")
  expect(screen.getByRole("status", { name: "Run result" })).toHaveTextContent(
    "8 steps done, 1 refused"
  )
})

test("Replicas 12 is refused with the bridge's words, and Replicas holds until step 5", async () => {
  const { user } = renderRun()
  for (let i = 0; i < 4; i++) await step(user)
  expect(stateOf("Scale to 12 replicas")).toBe("refused")
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
  const { user } = renderRun()
  const ask = await runToGate(user)
  await user.click(within(ask).getByRole("button", { name: "Refuse" }))
  await stateIs("Make Apollo public", "refused")

  expect(row("Make Apollo public")).toHaveTextContent(
    'The person said no to "Changes who can see Apollo".'
  )
  expect(pane.visibility()).toHaveTextContent("Private")
  expect(pane.name()).toHaveValue("Apollo API")
  expect(pane.region()).toHaveTextContent("Frankfurt")
  expect(pane.replicas()).toHaveValue("10")
  expect(pane.digest()).toBeChecked()
  expect(pane.mark()).toHaveTextContent("Rocket")
  expect(screen.getByRole("status", { name: "Run result" })).toHaveTextContent(
    "You refused Visibility. The steps before it stay applied: nothing rolls back."
  )
})

test("at the gate the dialog holds the page, and Escape is the stop: it refuses the step", async () => {
  const { user } = renderRun()
  const ask = await runToGate(user)
  // The modal makes the rest of the page inert in a browser (jsdom doesn't), so the console's Stop can't be
  // pressed here: the stop at the gate is the dialog's own Refuse or Escape.
  expect(ask).toHaveAttribute("aria-modal", "true")
  expect(within(ask).getByRole("button", { name: "Refuse" })).toHaveFocus()
  await user.keyboard("{Escape}")
  await gateClosed()
  await stateIs("Make Apollo public", "refused")
  expect(pane.visibility()).toHaveTextContent("Private")
  await idle()
  expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled()
})

test("Stop between steps keeps what applied and leaves the rest ready", async () => {
  const { user } = renderRun({ pacing: { leadIn: 0, between: 60_000 } })
  await press(user, "Run")
  await stateIs("Read the page", "done")
  await press(user, "Stop")
  await idle()
  expect(states()).toEqual(["done", ...Array(8).fill("idle")])
  expect(screen.getByRole("button", { name: "Run" })).toBeEnabled()

  await press(user, "Run")
  await stateIs("Rename the project", "done")
  expect(pane.name()).toHaveValue("Apollo API")
})

test("Stop during the read leaves it ready, not done", async () => {
  const { user } = renderRun()
  const query = agent.query.bind(agent)
  let release = () => {}
  const held = new Promise<void>((done) => (release = done))
  vi.spyOn(agent, "query").mockImplementationOnce(async (options) => {
    await held
    return query(options)
  })
  await press(user, "Run")
  await stateIs("Read the page", "running")
  await press(user, "Stop")
  release()
  await idle()
  expect(stateOf("Read the page")).toBe("idle")
  expect(row("Read the page")).toHaveTextContent("Stopped before it applied.")
  expect(states()).toEqual(Array(9).fill("idle"))
})

test("Stop right after Allow: the step reads as the pane shows it, and the next Run doesn't redo it", async () => {
  const { user } = renderRun()
  const ask = await runToGate(user)
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await press(user, "Stop")
  await idle()
  await until(() => expect(pane.visibility()).toHaveTextContent("Public"))
  expect(stateOf("Make Apollo public")).toBe("done")
  expect(row("Make Apollo public")).not.toHaveTextContent("Stopped before it applied.")
  expect(screen.getByRole("button", { name: "Run" })).toBeDisabled()
})

test("Reset restores the defaults and clears every step", async () => {
  const { user } = renderRun()
  const ask = await runToGate(user)
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await stateIs("Make Apollo public", "done")

  await press(user, "Reset")
  expect(states()).toEqual(Array(9).fill("idle"))
  expect(pane.name()).toHaveValue("Apollo")
  expect(pane.region()).toHaveTextContent("Virginia")
  expect(pane.replicas()).toHaveValue("2")
  expect(pane.digest()).not.toBeChecked()
  expect(pane.mark()).toHaveTextContent("Flag")
  expect(pane.visibility()).toHaveTextContent("Private")
  expect(screen.getByRole("status", { name: "Run result" })).toBeEmptyDOMElement()
  expect(screen.getByRole("button", { name: "Run" })).toBeEnabled()
})

test("the agent is the bridge the plan drives", async () => {
  const { user } = renderRun()
  await step(user)
  await step(user)
  expect(stateOf("Rename the project")).toBe("done")
  const name = agent.snapshot().find((entry) => entry.label === "Project name")
  expect(name?.value).toBe("Apollo API")
})

test("when the section leaves mid-run, the ask closes and the bridge takes the next call", async () => {
  const { user, leave } = renderRun()
  await runToGate(user)
  leave()
  await gateClosed()
  expect(overlays.entries()).toEqual([])
  // Calls on one bridge queue behind a pending ask, so this only settles once the run has let go.
  const next = await agent.act({ steps: [{ ref: "Project name", action: "setValue", args: ["x"] }] })
  expect(next.ok).toBe(false)
})
