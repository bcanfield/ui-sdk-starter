import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { agent } from "../agent.ts"
import { App } from "../App.tsx"

const SENTENCE = "Changes who can see Apollo"

function paneEntries() {
  return agent
    .snapshot()
    .filter((entry) => !entry.offPage && entry.component !== "more")
}

test("the pane is an Agent run section with its history hook", () => {
  render(<App />)
  const section = screen.getByRole("region", { name: "Agent run" })
  expect(section).toHaveAttribute("id", "agent-run")
  expect(section.querySelectorAll("[data-pane]")).toHaveLength(1)
})

test("every control in the snapshot has a name, and no two share one", () => {
  render(<App />)
  const entries = paneEntries()
  for (const entry of entries) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
  }
  const labels = entries.map((entry) => entry.label)
  for (const label of ["Project name", "Region", "Replicas", "Visibility"]) {
    expect(labels, `${label} is missing`).toContain(label)
  }
  expect(new Set(labels).size, "two controls share a label").toBe(labels.length)
})

test("a person can operate every control", async () => {
  const user = userEvent.setup()
  render(<App />)

  const name = screen.getByLabelText("Project name")
  await user.clear(name)
  await user.type(name, "Atlas")
  expect(name).toHaveValue("Atlas")

  await user.click(screen.getByRole("combobox", { name: "Region" }))
  await user.click(await screen.findByRole("option", { name: "Tokyo" }))
  expect(screen.getByRole("combobox", { name: "Region" })).toHaveTextContent("Tokyo")

  await user.click(screen.getByRole("button", { name: "Increase" }))
  expect(screen.getByRole("textbox", { name: "Replicas" })).toHaveValue("3")

  await user.click(screen.getByRole("tab", { name: "Notifications" }))
  await user.click(screen.getByRole("switch", { name: "Weekly digest" }))
  expect(screen.getByRole("switch", { name: "Weekly digest" })).toBeChecked()
  await user.type(screen.getByLabelText("Deploy token"), "x")
})

test("Deploy token reads [redacted], even on the closed tab", async () => {
  render(<App />)
  const found = await agent.query({ closed: true })
  expect(Array.isArray(found), JSON.stringify(found)).toBe(true)
  const token = (found as { label?: string; value?: unknown }[]).find(
    (entry) => entry.label === "Deploy token"
  )
  expect(token?.value).toBe("[redacted]")
  expect(screen.getByRole("tab", { name: "General" })).toHaveAttribute(
    "aria-selected",
    "true"
  )
})

test("an agent sets every control, and values survive the tab switches", async () => {
  render(<App />)
  const result = await agent.act({
    steps: [
      { ref: "Project name", action: "setValue", args: ["Apollo API"] },
      { ref: "Region", action: "setValue", args: ["frankfurt"] },
      { ref: "Replicas", action: "setValue", args: [8] },
      { ref: "Weekly digest", action: "setChecked", args: [true] },
      { ref: "Deploy token", action: "setValue", args: ["sk_new"] },
    ],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole("tab", { name: "General" })).toHaveAttribute(
    "aria-selected",
    "true"
  )
  expect(screen.getByLabelText("Project name")).toHaveValue("Apollo API")
  expect(screen.getByRole("combobox", { name: "Region" })).toHaveTextContent("Frankfurt")
  expect(screen.getByRole("textbox", { name: "Replicas" })).toHaveValue("8")
  expect(
    screen.getByRole("switch", { name: "Weekly digest", hidden: true })
  ).toBeChecked()
  expect(screen.getByLabelText("Deploy token")).toHaveValue("sk_new")
})

test("Visibility asks a person: Refuse keeps it, Allow applies it", async () => {
  const user = userEvent.setup()
  render(<App />)
  const visibility = () => screen.getByRole("combobox", { name: "Visibility" })
  const set = () =>
    agent.act({ steps: [{ ref: "Visibility", action: "setValue", args: ["public"] }] })

  const refused = set()
  const ask = await screen.findByRole("alertdialog", { name: "Let the agent continue?" })
  expect(ask).toHaveAccessibleDescription(SENTENCE)
  await user.click(screen.getByRole("button", { name: "Refuse" }))
  const first = await refused
  expect(first.ok).toBe(false)
  expect(first.error?.message).toMatch(/said no/)
  expect(visibility()).toHaveTextContent("Private")

  const allowed = set()
  await screen.findByRole("alertdialog", { name: "Let the agent continue?" })
  await user.click(screen.getByRole("button", { name: "Allow" }))
  expect((await allowed).ok).toBe(true)
  await waitFor(() => expect(visibility()).toHaveTextContent("Public"))
})

test("the step sends the value, so the person is asked once", async () => {
  const user = userEvent.setup()
  render(<App />)
  let asks = 0
  const run = agent.act({
    steps: [{ ref: "Visibility", action: "setValue", args: ["public"] }],
  })
  // Sending the label ("Public") instead asks twice, first with the label and then with the value (prototype VERDICT c).
  for (;;) {
    const allow = await screen
      .findByRole("button", { name: "Allow" }, { timeout: 500 })
      .catch(() => null)
    if (!allow) break
    asks++
    await user.click(allow)
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
  }
  expect((await run).ok).toBe(true)
  expect(asks).toBe(1)
})
