import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OverlayHost } from "@ui-sdk/react/overlays"
import { afterEach, expect, test } from "vitest"
import { agent } from "../agent.ts"
import { AgentRunSection } from "./agent-run-section.tsx"

type User = ReturnType<typeof userEvent.setup>

afterEach(() => window.history.replaceState(null, "", "/"))

function renderRun() {
  window.history.replaceState(null, "", "/?console=log")
  const user = userEvent.setup()
  render(
    <>
      <AgentRunSection pacing={{ leadIn: 0, between: 0 }} />
      <OverlayHost />
    </>
  )
  return user
}

const pane = {
  name: () => screen.getByLabelText("Project name"),
  region: () => screen.getByRole("combobox", { name: "Region" }),
  replicas: () => screen.getByRole("textbox", { name: "Replicas" }),
  digest: () => screen.getByRole("switch", { name: "Weekly digest", hidden: true }),
  visibility: () => screen.getByRole("combobox", { name: "Visibility" }),
  token: () => screen.getByLabelText("Deploy token", { selector: "input" }),
}

const press = (user: User, name: string) => user.click(screen.getByRole("button", { name }))
const logRows = () => within(screen.getByRole("list", { name: "Log" })).queryAllByRole("listitem")
const logText = () => logRows().map((row) => row.textContent)
const undoResult = () => screen.getByRole("status", { name: "Undo result" })
const gate = () => screen.findByRole("alertdialog", { name: "Let the agent continue?" })

async function runWithAllow(user: User) {
  await press(user, "Run")
  const ask = await gate()
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await waitFor(() => expect(logText()).toContain("agentVisibility → Public"))
  await waitFor(() => expect(screen.getByRole("button", { name: "Stop" })).toBeDisabled())
}

async function personEdits(user: User) {
  await user.clear(pane.name())
  await user.type(pane.name(), "Atlas")
  await user.click(pane.region())
  await user.click(await screen.findByRole("option", { name: "Tokyo" }))
}

async function undoAgent(user: User, answer: "Allow" | "Refuse" = "Allow") {
  await press(user, "Undo agent")
  const ask = await gate()
  expect(ask).toHaveAccessibleDescription("Changes who can see Apollo")
  await user.click(within(ask).getByRole("button", { name: answer }))
  await waitFor(() => expect(undoResult()).not.toBeEmptyDOMElement())
}

test("?console=log selects the Log tab", () => {
  renderRun()
  expect(screen.getByRole("tab", { name: "Log" })).toHaveAttribute("aria-selected", "true")
  expect(logRows()).toHaveLength(0)
})

test("the console copy explains undo, the gate and the Deploy token", () => {
  renderRun()
  expect(
    screen.getByText(
      "Change anything during or after the run, then undo the agent. Your changes stay. Undo may ask you again, and it leaves the Deploy token alone."
    )
  ).toBeInTheDocument()
})

test("the log reads as prose with item labels, a source tag per entry, and no tab switches", async () => {
  const user = renderRun()
  await runWithAllow(user)
  await personEdits(user)

  expect(logText()).toEqual([
    "agentProject name → Apollo API",
    "agentRegion → Frankfurt",
    "agentReplicas → 10",
    "agentWeekly digest → on",
    "agentVisibility → Public",
    "youProject name → Atlas",
    "youRegion → Tokyo",
  ])
  expect(logText().join(" ")).not.toMatch(/Project settings/)
})

test("undo agent restores the agent's controls and keeps the person's two edits", async () => {
  const user = renderRun()
  await runWithAllow(user)
  await personEdits(user)
  await undoAgent(user)

  expect(undoResult()).toHaveTextContent("Agent's changes undone. Yours stayed.")
  expect(pane.name()).toHaveValue("Atlas")
  expect(pane.region()).toHaveTextContent("Tokyo")
  expect(pane.replicas()).toHaveValue("2")
  expect(pane.digest()).not.toBeChecked()
  expect(pane.visibility()).toHaveTextContent("Private")
})

test("Refuse at undo's gate leaves Visibility public and reports it as not put back", async () => {
  const user = renderRun()
  await runWithAllow(user)
  await personEdits(user)
  await undoAgent(user, "Refuse")

  expect(pane.visibility()).toHaveTextContent("Public")
  expect(undoResult()).toHaveTextContent(/^Couldn't put back: Visibility \(c\d+\) value$/)
  expect(pane.replicas()).toHaveValue("2")
  expect(pane.digest()).not.toBeChecked()
  expect(pane.name()).toHaveValue("Atlas")
})

test("a person's Deploy token stays through undo agent, and the log shows it redacted", async () => {
  const user = renderRun()
  await runWithAllow(user)
  await user.click(screen.getByRole("tab", { name: "Notifications" }))
  await user.clear(pane.token())
  await user.type(pane.token(), "sk_mine")
  await undoAgent(user)

  expect(pane.token()).toHaveValue("sk_mine")
  expect(undoResult()).toHaveTextContent("Agent's changes undone. Yours stayed.")
  const tokenRows = logText().filter((text) => text?.includes("Deploy token"))
  expect(tokenRows.length).toBeLessThanOrEqual(1)
  for (const text of tokenRows) {
    expect(text).toBe("youDeploy token → redacted")
    expect(text).not.toMatch(/sk_mine/)
  }
})

test("Reset empties the log and the undo result", async () => {
  const user = renderRun()
  await runWithAllow(user)
  await personEdits(user)
  await undoAgent(user)
  await press(user, "Reset")

  expect(logRows()).toHaveLength(0)
  expect(undoResult()).toBeEmptyDOMElement()
  expect(pane.name()).toHaveValue("Apollo")
})

test("run, person edit, undo agent, Reset: five times with nothing left unrestored", async () => {
  const user = renderRun()
  for (let round = 1; round <= 5; round++) {
    await runWithAllow(user)
    await personEdits(user)
    await undoAgent(user)

    expect(undoResult(), `round ${round}`).toHaveTextContent(
      "Agent's changes undone. Yours stayed."
    )
    expect(undoResult().textContent, `round ${round}`).not.toMatch(/Couldn't put back/)
    expect(pane.replicas(), `round ${round}`).toHaveValue("2")
    expect(pane.digest(), `round ${round}`).not.toBeChecked()
    expect(pane.visibility(), `round ${round}`).toHaveTextContent("Private")
    expect(pane.name(), `round ${round}`).toHaveValue("Atlas")
    expect(pane.region(), `round ${round}`).toHaveTextContent("Tokyo")

    await press(user, "Reset")
    expect(logRows(), `round ${round}`).toHaveLength(0)
  }
})

test("the agent can't see or press Undo agent", async () => {
  renderRun()
  expect(screen.getByRole("button", { name: "Undo agent" })).toBeInTheDocument()
  const result = await agent.act({ steps: [{ ref: "Undo agent", action: "press" }] })
  expect(result.ok).toBe(false)
  expect(await agent.query({ text: "Undo agent" })).toEqual([])
  expect(agent.snapshot().map((entry) => entry.label)).not.toContain("Undo agent")
})

test("no plan step targets the Deploy token", async () => {
  const { plan } = await import("./plan.ts")
  const refs = plan.flatMap((step) => step.steps ?? []).map((s) => s.ref)
  expect(refs.length).toBeGreaterThan(0)
  expect(refs).not.toContain("Deploy token")
})
