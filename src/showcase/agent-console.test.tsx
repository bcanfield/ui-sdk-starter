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

test("switching tabs adds a history entry, the default tab leaves ?console off, and back and forward restore the tab", async () => {
  const user = userEvent.setup()
  const tab = (name: string) => screen.getByRole("tab", { name })
  const param = () => new URL(window.location.href).searchParams.get("console")
  const start = window.history.length
  render(<App />)
  expect(window.history.length).toBe(start)

  await user.click(tab("Log"))
  expect(param()).toBe("log")
  await user.click(tab("Plan"))
  expect(param()).toBeNull()
  expect(window.history.length).toBe(start + 2)

  window.history.back()
  await waitFor(() => expect(tab("Log")).toHaveAttribute("aria-selected", "true"))
  expect(param()).toBe("log")

  window.history.forward()
  await waitFor(() => expect(tab("Plan")).toHaveAttribute("aria-selected", "true"))
  expect(param()).toBeNull()
  expect(window.history.length).toBe(start + 2)
})
