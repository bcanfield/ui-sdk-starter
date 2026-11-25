import { fireEvent, screen, within } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { agent } from "../agent.ts"
import { gate, press, renderRun as renderSection, until, type User } from "./run-kit.tsx"

afterEach(() => {
  window.history.replaceState(null, "", "/")
  Reflect.deleteProperty(document, "modelContext")
})

const renderRun = (query = "") => renderSection({ query }).user

const ownInput = () => screen.getByRole("textbox", { name: "Run your own step" })
const ownResult = () => screen.getByRole("status", { name: "Own step result" })
const runOwn = (user: User) => press(user, "Run step")
const setOwn = (value: string) => {
  fireEvent.input(ownInput(), { target: { value } })
}
const typeOwn = (value: unknown) => setOwn(JSON.stringify(value))
const shownSnapshot = () =>
  JSON.parse(screen.getByLabelText("Agent snapshot").textContent ?? "[]") as {
    label: string
    value?: unknown
    component: string
  }[]

test("the textarea is prefilled with a valid act call that changes the pane", async () => {
  const user = renderRun()
  expect(() => JSON.parse((ownInput() as HTMLTextAreaElement).value)).not.toThrow()
  await runOwn(user)
  await until(() => expect(ownResult()).toHaveTextContent(/^ok/))
  expect(ownResult()).toHaveAttribute("data-state", "ok")
  expect(screen.getByLabelText("Project name")).toHaveValue("Apollo Edge")
  expect(ownResult()).toHaveTextContent('Project name value → "Apollo Edge"')
})

test("a confirm-marked own step asks through the dialog", async () => {
  const user = renderRun()
  typeOwn({ steps: [{ ref: "Visibility", action: "setValue", args: ["public"] }] })
  await runOwn(user)
  const ask = await gate()
  expect(ask).toHaveAccessibleDescription("Changes who can see Apollo")
  await user.click(within(ask).getByRole("button", { name: "Refuse" }))
  await until(() => expect(ownResult()).toHaveTextContent(/^error/))
  expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveTextContent("Private")
})

test("a malformed step shows the bridge's own shape error, marked as an error, and changes nothing", async () => {
  const user = renderRun()
  const bad = { steps: [{ ref: "Project name", action: "setValue", value: "x" }] }
  const expected = (await agent.act(bad as never)).error?.message
  expect(expected).toBeTruthy()
  typeOwn(bad)
  await runOwn(user)
  await until(() => expect(ownResult()).toHaveTextContent(expected!))
  expect(ownResult()).toHaveTextContent(/^error/)
  expect(ownResult()).toHaveAttribute("data-state", "error")
  expect(screen.getByLabelText("Project name")).toHaveValue("Apollo")
})

test("invalid JSON is shown as a JSON parse error", async () => {
  const user = renderRun()
  setOwn("{ nope")
  await runOwn(user)
  expect(ownResult()).toHaveTextContent(/^JSON parse error/)
  expect(ownResult()).toHaveAttribute("data-state", "error")
  expect(screen.getByLabelText("Project name")).toHaveValue("Apollo")
})

test("?console=snapshot shows what the agent sees: General's controls, and Notifications as a tab to open", () => {
  renderRun("?console=snapshot")
  expect(screen.getByRole("tab", { name: "Snapshot" })).toHaveAttribute("aria-selected", "true")
  const labels = shownSnapshot().map((entry) => entry.label)
  expect(labels).toEqual(
    expect.arrayContaining(["Project name", "Region", "Replicas", "Project mark", "Visibility"])
  )
  expect(labels).not.toContain("Weekly digest")
  expect(labels).not.toContain("Deploy token")
})

test("with Notifications open the snapshot shows the Deploy token redacted", async () => {
  const user = renderRun("?console=snapshot")
  await user.click(screen.getByRole("tab", { name: "Notifications" }))
  await until(() =>
    expect(shownSnapshot().map((entry) => entry.label)).toContain("Deploy token")
  )
  expect(shownSnapshot().find((entry) => entry.label === "Deploy token")?.value).toBe("[redacted]")
  expect(screen.getByLabelText("Agent snapshot")).not.toHaveTextContent("apollo-demo-token")
})

test("the snapshot updates when the pane changes", async () => {
  const user = renderRun("?console=snapshot")
  await user.clear(screen.getByLabelText("Project name"))
  await user.type(screen.getByLabelText("Project name"), "Atlas")
  await until(() => expect(screen.getByLabelText("Agent snapshot")).toHaveTextContent('"Atlas"'))
})

test("the WebMCP badge reads not detected in jsdom", () => {
  renderRun()
  expect(screen.getByText("WebMCP: not detected")).toBeInTheDocument()
})

test("the WebMCP badge says tools are offered when document.modelContext exists", () => {
  Object.assign(document, { modelContext: { registerTool: async () => {} } })
  renderRun()
  expect(screen.getByText("WebMCP: tools offered to this browser's agent")).toBeInTheDocument()
})

test("the Plan tab's done rows leave out the bridge's tab switches", async () => {
  const user = renderRun()
  for (let i = 0; i < 7; i++) {
    await press(user, "Step")
    await until(() => expect(screen.getAllByTestId("step-state")[i]).toHaveTextContent(/done|refused/))
  }
  const text = screen.getByRole("list", { name: "Plan" }).textContent ?? ""
  expect(text).toMatch(/Weekly digest/)
  expect(text).not.toMatch(/Project settings/)
})
