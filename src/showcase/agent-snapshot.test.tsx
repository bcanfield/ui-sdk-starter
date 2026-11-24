import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OverlayHost } from "@ui-sdk/react/overlays"
import { afterEach, expect, test } from "vitest"
import { agent } from "../agent.ts"
import { AgentRunSection } from "./agent-run-section.tsx"

afterEach(() => {
  window.history.replaceState(null, "", "/")
  Reflect.deleteProperty(document, "modelContext")
})

function renderRun(query = "") {
  window.history.replaceState(null, "", `/${query}`)
  const user = userEvent.setup()
  render(
    <>
      <AgentRunSection pacing={{ leadIn: 0, between: 0 }} />
      <OverlayHost />
    </>
  )
  return user
}

type User = ReturnType<typeof userEvent.setup>

const ownInput = () => screen.getByRole("textbox", { name: "Run your own step" })
const ownResult = () => screen.getByRole("status", { name: "Own step result" })
const runOwn = (user: User) => user.click(screen.getByRole("button", { name: "Run step" }))
const setOwn = (value: string) => {
  fireEvent.input(ownInput(), { target: { value } })
}
const typeOwn = (value: unknown) => setOwn(JSON.stringify(value))

test("the textarea is prefilled with a valid act call that changes the pane", async () => {
  const user = renderRun()
  expect(() => JSON.parse((ownInput() as HTMLTextAreaElement).value)).not.toThrow()
  await runOwn(user)
  await waitFor(() => expect(ownResult()).toHaveTextContent(/^ok/))
  expect(screen.getByLabelText("Project name")).toHaveValue("Apollo Edge")
  expect(ownResult()).toHaveTextContent('Project name value → "Apollo Edge"')
})

test("a confirm-marked own step asks through the dialog", async () => {
  const user = renderRun()
  typeOwn({ steps: [{ ref: "Visibility", action: "setValue", args: ["public"] }] })
  await runOwn(user)
  const ask = await screen.findByRole("alertdialog", { name: "Let the agent continue?" })
  expect(ask).toHaveAccessibleDescription("Changes who can see Apollo")
  await user.click(within(ask).getByRole("button", { name: "Refuse" }))
  await waitFor(() => expect(ownResult()).toHaveTextContent(/^error/))
  expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveTextContent("Private")
})

test("a malformed step shows the bridge's own shape error and changes nothing", async () => {
  const user = renderRun()
  const bad = { steps: [{ ref: "Project name", action: "setValue", value: "x" }] }
  const expected = (await agent.act(bad as never)).error?.message
  expect(expected).toBeTruthy()
  typeOwn(bad)
  await runOwn(user)
  await waitFor(() => expect(ownResult()).toHaveTextContent(expected!))
  expect(ownResult()).toHaveTextContent(/^error/)
  expect(screen.getByLabelText("Project name")).toHaveValue("Apollo")
})

test("invalid JSON is shown as a JSON parse error", async () => {
  const user = renderRun()
  setOwn("{ nope")
  await runOwn(user)
  expect(ownResult()).toHaveTextContent(/^JSON parse error/)
  expect(screen.getByLabelText("Project name")).toHaveValue("Apollo")
})

test("?console=snapshot lists the pane controls and Deploy token is redacted", () => {
  renderRun("?console=snapshot")
  expect(screen.getByRole("tab", { name: "Snapshot" })).toHaveAttribute("aria-selected", "true")
  const block = screen.getByLabelText("Agent snapshot")
  const shown = JSON.parse(block.textContent ?? "[]") as { label: string; value?: unknown }[]
  expect(shown.map((entry) => entry.label)).toEqual(
    expect.arrayContaining([
      "Project name",
      "Region",
      "Replicas",
      "Visibility",
      "Weekly digest",
      "Deploy token",
    ])
  )
  expect(shown.find((entry) => entry.label === "Deploy token")?.value).toBe("[redacted]")
  expect(block).not.toHaveTextContent("apollo-demo-token")
})

test("the snapshot updates when the pane changes", async () => {
  const user = renderRun("?console=snapshot")
  await user.clear(screen.getByLabelText("Project name"))
  await user.type(screen.getByLabelText("Project name"), "Atlas")
  await waitFor(() =>
    expect(screen.getByLabelText("Agent snapshot")).toHaveTextContent('"Atlas"')
  )
})

test("the WebMCP badge reads not detected in jsdom", () => {
  renderRun()
  expect(screen.getByText("WebMCP: not detected")).toBeInTheDocument()
})

test("the WebMCP badge says tools are offered when document.modelContext exists", () => {
  Object.assign(document, { modelContext: { registerTool: async () => {} } })
  renderRun()
  expect(
    screen.getByText("WebMCP: tools offered to this browser's agent")
  ).toBeInTheDocument()
})

test("the Plan tab's done rows leave out the bridge's tab switches", async () => {
  const user = renderRun()
  for (let i = 0; i < 6; i++) {
    await user.click(screen.getByRole("button", { name: "Step" }))
    await waitFor(() =>
      expect(screen.getAllByTestId("step-state")[i]).toHaveTextContent(/done|refused/)
    )
  }
  const text = screen.getByRole("list", { name: "Plan" }).textContent ?? ""
  expect(text).toMatch(/Weekly digest/)
  expect(text).not.toMatch(/Project settings/)
})
