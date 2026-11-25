import { screen, within } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { agent } from "../agent.ts"
import { gate, gateClosed, press, renderRun, until } from "./run-kit.tsx"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const trace = (container: HTMLElement) => container.querySelector("[data-agent-trace]")
const traceGone = (container: HTMLElement) => until(() => expect(trace(container)).toBeNull())

// Every place the trace lands, in order, with repeats collapsed.
function recordTrace(container: HTMLElement) {
  const seen: string[] = []
  const push = (value: string | null | undefined) => {
    if (value && seen.at(-1) !== value) seen.push(value)
  }
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") push(record.oldValue)
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement && node.matches("[data-agent-trace]")) push(node.dataset.target)
      }
      for (const node of record.removedNodes) {
        if (node instanceof HTMLElement && node.matches("[data-agent-trace]")) push(node.dataset.target)
      }
    }
  })
  observer.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-target"],
    attributeOldValue: true,
  })
  return () => {
    for (const record of observer.takeRecords()) if (record.type === "attributes") push(record.oldValue)
    observer.disconnect()
    push((trace(container) as HTMLElement | null)?.dataset.target)
    return seen
  }
}

const rowOf = (say: string) =>
  within(screen.getByRole("list", { name: "Plan" }))
    .getAllByRole("listitem")
    .find((item) => item.textContent?.includes(say))!
const stateIs = (say: string, state: string) =>
  until(() => expect(rowOf(say)).toHaveAttribute("data-state", state))

test("the trace lands on each step's target, on a closed panel's tab first, and leaves when the run ends", async () => {
  const { user, container } = renderRun()
  expect(trace(container)).toBeNull()
  const stop = recordTrace(container)

  await press(user, "Run")
  const ask = await gate()
  expect(trace(container)).toHaveAttribute("aria-hidden", "true")
  expect(trace(container)).toHaveTextContent(/agent/i)
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await stateIs("Make Apollo public", "done")
  await traceGone(container)

  expect(stop()).toEqual([
    "pane",
    "name",
    "region",
    "replicas",
    "mark",
    "tab:notifications",
    "digest",
    "tab:general",
    "visibility",
  ])
  expect(agent.snapshot().find((entry) => entry.label === "Visibility")?.value).toBe("public")
  // Like every other field, the mark's box holds its label, so the AGENT tag sits above the label, not on it.
  const mark = container.querySelector<HTMLElement>('[data-trace="mark"]')!
  expect(within(mark).getByText("Project mark")).toBeInTheDocument()
  expect(mark.querySelector('[data-slot="project-mark-trigger"]')).not.toBeNull()
})

test("the step at the gate is marked waiting with the trace on its control, and Refuse takes the trace away", async () => {
  const { user, container } = renderRun()
  await press(user, "Run")
  const ask = await gate()
  await stateIs("Make Apollo public", "waiting")
  await until(() => expect(trace(container)).toHaveAttribute("data-target", "visibility"))

  await user.click(within(ask).getByRole("button", { name: "Refuse" }))
  await gateClosed()
  await traceGone(container)
  expect(agent.snapshot().find((entry) => entry.label === "Visibility")?.value).toBe("private")
})

test("when the gate opens, the control it asks about is brought to mid-screen, clear of the strip and the dialog", async () => {
  const { user, container } = renderRun()
  const field = container.querySelector<HTMLElement>('[data-trace="visibility"]')!
  // jsdom lays nothing out: put Visibility low on a 390 × 844 screen, where a bottom-anchored dialog would sit.
  vi.spyOn(field, "getBoundingClientRect").mockReturnValue(new DOMRect(16, 760, 358, 70))
  const scrolled = vi.spyOn(field, "scrollIntoView")
  await press(user, "Run")
  await gate()
  await until(() => expect(scrolled).toHaveBeenLastCalledWith(expect.objectContaining({ block: "center" })))
})

test("the trace is there only while a run goes: Stop and a single Step both take it away", async () => {
  const { user, container } = renderRun({ pacing: { leadIn: 0, between: 60_000 } })
  await press(user, "Run")
  await stateIs("Read the page", "done")
  expect(trace(container)).not.toBeNull()
  await press(user, "Stop")
  await traceGone(container)

  await press(user, "Step")
  await stateIs("Rename the project", "done")
  await traceGone(container)
})

function stubWidth(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("min-width: 56rem") ? wide : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }))
}

const playButtons = () => screen.getAllByRole("button", { name: /^(Run|Step|Stop)$/ })

test("below 56rem the strip holds the only Run, Step and Stop, and narrates the step with its status", async () => {
  stubWidth(false)
  const { user } = renderRun()
  const strip = screen.getByRole("group", { name: "Now playing" })
  expect(playButtons()).toHaveLength(3)
  for (const button of playButtons()) expect(strip).toContainElement(button)
  expect(strip).toHaveTextContent("Move Apollo to Frankfurt, scale it, give it a mark and make it public")
  expect(strip).not.toContainElement(screen.getByRole("button", { name: "Reset" }))

  await user.click(within(strip).getByRole("button", { name: "Run" }))
  await gate()
  await until(() => expect(strip).toHaveTextContent("needs you"))
  expect(strip).toHaveTextContent("9/9")
  expect(strip).toHaveTextContent("Make Apollo public")
})

test("below 56rem Stop in the strip stops the run", async () => {
  stubWidth(false)
  const { user } = renderRun({ pacing: { leadIn: 0, between: 60_000 } })
  const strip = screen.getByRole("group", { name: "Now playing" })
  await user.click(within(strip).getByRole("button", { name: "Run" }))
  await stateIs("Read the page", "done")
  await user.click(within(strip).getByRole("button", { name: "Stop" }))
  await until(() => expect(within(strip).getByRole("button", { name: "Run" })).toBeEnabled())
  expect(within(strip).getByRole("button", { name: "Stop" })).toBeDisabled()
  expect(rowOf("Rename the project")).toHaveAttribute("data-state", "idle")
})

test("a refused step reads refused in the strip", async () => {
  stubWidth(false)
  const { user } = renderRun()
  const strip = screen.getByRole("group", { name: "Now playing" })
  for (let i = 0; i < 4; i++) {
    await user.click(within(strip).getByRole("button", { name: "Step" }))
    await until(() => expect(within(strip).getByRole("button", { name: "Step" })).toBeEnabled())
  }
  expect(strip).toHaveTextContent("4/9")
  expect(strip).toHaveTextContent("Scale to 12 replicas")
  expect(strip).toHaveTextContent("refused")
})

test("from 56rem the console holds the only Run, Step and Stop, and there is no strip", () => {
  stubWidth(true)
  renderRun()
  expect(screen.queryByRole("group", { name: "Now playing" })).toBeNull()
  expect(playButtons()).toHaveLength(3)
})
