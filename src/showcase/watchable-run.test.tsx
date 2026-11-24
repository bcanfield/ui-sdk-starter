import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OverlayHost } from "@ui-sdk/react/overlays"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { agent } from "../agent.ts"
import { AgentRunSection } from "./agent-run-section.tsx"

// setup.ts reports every element visible, so the bridge would set Weekly digest without opening its tab.
// Here a closed panel's content is hidden, as in a browser.
beforeEach(() => {
  vi.spyOn(Element.prototype, "checkVisibility").mockImplementation(function (this: Element) {
    return !this.closest("[hidden]")
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderRun() {
  const user = userEvent.setup()
  const { container } = render(
    <>
      <AgentRunSection pacing={{ leadIn: 0, between: 0 }} />
      <OverlayHost />
    </>
  )
  return { user, container }
}

const trace = (container: HTMLElement) => container.querySelector("[data-agent-trace]")

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

const stateOf = (say: string) => {
  const row = within(screen.getByRole("list", { name: "Plan" }))
    .getAllByRole("listitem")
    .find((item) => item.textContent?.includes(say))!
  return row
}

test("the trace lands on each step's target, on a closed panel's tab first, and leaves when the run ends", async () => {
  const { user, container } = renderRun()
  expect(trace(container)).toBeNull()
  const stop = recordTrace(container)

  await user.click(screen.getByRole("button", { name: "Run" }))
  const ask = await screen.findByRole("alertdialog", { name: "Let the agent continue?" })
  expect(trace(container)).toHaveAttribute("aria-hidden", "true")
  expect(trace(container)).toHaveTextContent(/agent/i)
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await waitFor(() => expect(stateOf("Make Apollo public")).toHaveAttribute("data-state", "done"))
  await waitFor(() => expect(trace(container)).toBeNull())

  expect(stop()).toEqual([
    "pane",
    "name",
    "region",
    "replicas",
    "tab:notifications",
    "digest",
    "tab:general",
    "visibility",
  ])
  expect(agent.snapshot().find((entry) => entry.label === "Visibility")?.value).toBe("public")
})

test("the step at the gate is marked waiting with the trace on its control, and Reset takes the trace away", async () => {
  const { user, container } = renderRun()
  await user.click(screen.getByRole("button", { name: "Run" }))
  await screen.findByRole("alertdialog", { name: "Let the agent continue?" })
  expect(stateOf("Make Apollo public")).toHaveAttribute("data-state", "waiting")
  await waitFor(() => expect(trace(container)).toHaveAttribute("data-target", "visibility"))

  // The modal dialog takes a person's pointer, so user-event can't reach Reset; this dispatches its click directly.
  fireEvent.click(screen.getByRole("button", { name: "Reset" }))
  await waitFor(() => expect(trace(container)).toBeNull())
  expect(agent.snapshot().find((entry) => entry.label === "Visibility")?.value).toBe("private")
})

function stubWidth(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("min-width: 56rem") ? wide : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }))
}

const playButtons = () => screen.getAllByRole("button", { name: /^(Run|Step)$/ })

test("below 56rem the strip holds the only Run and Step, and narrates the step with its status", async () => {
  stubWidth(false)
  const { user } = renderRun()
  const strip = screen.getByRole("group", { name: "Now playing" })
  expect(playButtons()).toHaveLength(2)
  for (const button of playButtons()) expect(strip).toContainElement(button)
  expect(strip).toHaveTextContent("Move Apollo to Frankfurt, scale it and make it public")

  await user.click(within(strip).getByRole("button", { name: "Run" }))
  await screen.findByRole("alertdialog", { name: "Let the agent continue?" })
  expect(strip).toHaveTextContent("8/8")
  expect(strip).toHaveTextContent("Make Apollo public")
  expect(strip).toHaveTextContent("needs you")
})

test("a refused step reads refused in the strip", async () => {
  stubWidth(false)
  const { user } = renderRun()
  const strip = screen.getByRole("group", { name: "Now playing" })
  for (let i = 0; i < 4; i++) {
    await user.click(within(strip).getByRole("button", { name: "Step" }))
    await waitFor(() => expect(within(strip).getByRole("button", { name: "Step" })).toBeEnabled())
  }
  expect(strip).toHaveTextContent("4/8")
  expect(strip).toHaveTextContent("Scale to 12 replicas")
  expect(strip).toHaveTextContent("refused")
})

test("from 56rem the console holds the only Run and Step, and there is no strip", () => {
  stubWidth(true)
  renderRun()
  expect(screen.queryByRole("group", { name: "Now playing" })).toBeNull()
  expect(playButtons()).toHaveLength(2)
})
