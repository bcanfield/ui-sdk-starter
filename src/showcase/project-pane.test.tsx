import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { agent } from "../agent.ts"
import { App } from "../App.tsx"
import { gate, gateClosed, until } from "./run-kit.tsx"

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
  for (const label of ["Project name", "Region", "Replicas", "Project mark", "Visibility"]) {
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
  await user.click(await until(() => screen.getByRole("option", { name: "Tokyo" })))
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

const markTrigger = () =>
  within(screen.getByRole("group", { name: "Project mark" })).getByRole("button")

test("Project mark sits between Replicas and Visibility, named by its visible label", () => {
  render(<App />)
  const general = screen.getByRole("tabpanel", { name: "General" })
  const order = within(general)
    .getAllByText(/^(Replicas|Project mark|Visibility)$/, { selector: "label" })
    .map((label) => label.textContent)
  expect(order).toEqual(["Replicas", "Project mark", "Visibility"])
  expect(screen.getAllByRole("group", { name: "Project mark" })).toHaveLength(1)
})

test("a person and the agent both set the project mark", async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(markTrigger())
  await user.click(await until(() => screen.getByRole("option", { name: "Bolt" })))
  expect(markTrigger()).toHaveTextContent("Bolt")

  const result = await agent.act({
    steps: [{ ref: "Project mark", action: "setValue", args: ["rocket"] }],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(markTrigger()).toHaveTextContent("Rocket")
})

// excerpt:start
test("an agent sets every control, and values survive the tab switches", async () => {
  const user = userEvent.setup()
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

  // The last two controls are on Notifications, so the bridge opened that tab.
  const tab = (name: string) => screen.getByRole("tab", { name })
  expect(tab("Notifications")).toHaveAttribute("aria-selected", "true")
  expect(screen.getByLabelText("Deploy token")).toHaveValue("sk_new")

  await user.click(tab("General"))
  expect(screen.getByLabelText("Project name")).toHaveValue("Apollo API")
  expect(screen.getByRole("combobox", { name: "Region" })).toHaveTextContent("Frankfurt")
  expect(screen.getByRole("textbox", { name: "Replicas" })).toHaveValue("8")
  expect(
    screen.getByRole("switch", { name: "Weekly digest", hidden: true })
  ).toBeChecked()
})
// excerpt:end

test("Visibility asks a person: Refuse keeps it, Allow applies it", async () => {
  const user = userEvent.setup()
  render(<App />)
  const visibility = () => screen.getByRole("combobox", { name: "Visibility" })
  const set = () =>
    agent.act({ steps: [{ ref: "Visibility", action: "setValue", args: ["public"] }] })

  const refused = set()
  const ask = await gate()
  expect(ask).toHaveAccessibleDescription(SENTENCE)
  await user.click(within(ask).getByRole("button", { name: "Refuse" }))
  const first = await refused
  expect(first.ok).toBe(false)
  expect(first.error?.message).toMatch(/said no/)
  expect(visibility()).toHaveTextContent("Private")

  const allowed = set()
  await user.click(within(await gate()).getByRole("button", { name: "Allow" }))
  expect((await allowed).ok).toBe(true)
  await until(() => expect(visibility()).toHaveTextContent("Public"))
})

test("the step sends the value, so the person is asked once", async () => {
  const user = userEvent.setup()
  render(<App />)
  const run = agent.act({
    steps: [{ ref: "Visibility", action: "setValue", args: ["public"] }],
  })
  const settled = run.then(() => null)
  // Sending the label ("Public") instead asks twice, first with the label and then with the value (prototype
  // VERDICT c). The act can't settle while an ask is open, so whichever comes first says if there is another.
  let asks = 0
  for (;;) {
    const ask = await Promise.race([settled, gate()])
    if (!ask) break
    asks++
    await user.click(within(ask).getByRole("button", { name: "Allow" }))
    await gateClosed()
  }
  expect((await run).ok).toBe(true)
  expect(asks).toBe(1)
})
