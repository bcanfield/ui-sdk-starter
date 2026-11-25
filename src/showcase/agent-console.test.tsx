import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test } from "vitest"
import { agent } from "../agent.ts"
import { App } from "../App.tsx"

const CONSOLE_NAMES = ["Run", "Step", "Stop", "Reset", "Plan", "Console"]

afterEach(() => window.history.replaceState(null, "", "/"))

test("the console is absent from the agent's snapshot and query", async () => {
  render(<App />)
  expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument()

  const labels = agent.snapshot().map((entry) => entry.label)
  for (const name of CONSOLE_NAMES) expect(labels).not.toContain(name)

  const found = await agent.query({ closed: true })
  expect(Array.isArray(found), JSON.stringify(found)).toBe(true)
  const queried = (found as { label?: string }[]).map((entry) => entry.label)
  for (const name of CONSOLE_NAMES) expect(queried).not.toContain(name)
  expect(await agent.query({ text: "Run" })).toEqual([])
})

test("the agent can't press Run", async () => {
  render(<App />)
  const result = await agent.act({ steps: [{ ref: "Run", action: "press" }] })
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/Run/)
  expect(screen.getAllByTestId("step-state").map((s) => s.textContent)).toEqual(
    Array(9).fill("ready")
  )
})

test("the console says the agent is scripted and can't see it", () => {
  render(<App />)
  expect(screen.getByText(/scripted: a written plan, no model/i)).toBeInTheDocument()
  expect(screen.getByText(/each step is its own act call/i)).toBeInTheDocument()
  expect(screen.getByText(/agent can't see or press this console/i)).toBeInTheDocument()
  expect(screen.getByText(/Refuse or Esc is how you stop there\./)).toBeInTheDocument()
})

test("the console says one act per step is for watching, and a real agent sends the task in one act", () => {
  render(<App />)
  expect(screen.getByText(/its own act call so you can watch it/i)).toBeInTheDocument()
  expect(screen.getByText(/the ui-sdk docs say to plan the whole task and send it in one act call/i)).toBeInTheDocument()
})

test("?console= selects the console tab, and an unknown one falls back to Plan", () => {
  window.history.replaceState(null, "", "/?console=nope")
  render(<App />)
  expect(screen.getByRole("tab", { name: "Plan" })).toHaveAttribute("aria-selected", "true")
})

const tab = (name: string) => screen.getByRole("tab", { name })
const param = () => new URL(window.location.href).searchParams.get("console")

test("switching tabs, by arrow keys too, rewrites ?console in place, and the default tab leaves it off", async () => {
  const user = userEvent.setup()
  window.history.replaceState({ kept: true }, "", "/")
  const start = window.history.length
  render(<App />)

  await user.click(tab("Log"))
  expect(param()).toBe("log")
  // Tabs activate on focus, so each arrow press is a switch.
  await user.keyboard("{ArrowLeft}")
  expect(tab("Snapshot")).toHaveAttribute("aria-selected", "true")
  expect(param()).toBe("snapshot")
  await user.keyboard("{ArrowLeft}")
  expect(tab("Plan")).toHaveAttribute("aria-selected", "true")
  expect(param()).toBeNull()

  expect(window.history.length).toBe(start)
  expect(window.history.state).toEqual({ kept: true })
})

test("back to an entry an in-page link left behind restores the tab it was on", async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(tab("Log"))
  await user.click(screen.getByRole("link", { name: "built from core" }))
  await user.click(tab("Plan"))
  expect(param()).toBeNull()

  window.history.back()
  await waitFor(() => expect(tab("Log")).toHaveAttribute("aria-selected", "true"))
  expect(param()).toBe("log")
})
