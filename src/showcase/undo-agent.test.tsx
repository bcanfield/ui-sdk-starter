import { screen, within } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { gate, gateClosed, press, renderRun as renderSection, until, type User } from "./run-kit.tsx"

const undo = vi.hoisted(() => ({ fail: null as Error | null, hold: Promise.resolve() }))

vi.mock("@ui-sdk/react/history", async (load) => {
  const real = await load<typeof import("@ui-sdk/react/history")>()
  return {
    ...real,
    createHistory: (...args: Parameters<typeof real.createHistory>) => {
      const recorder = real.createHistory(...args)
      const undoSource = recorder.undoSource.bind(recorder)
      recorder.undoSource = async (source) => {
        if (undo.fail) throw undo.fail
        const missed = await undoSource(source)
        await undo.hold
        return missed
      }
      return recorder
    },
  }
})

afterEach(() => {
  undo.fail = null
  undo.hold = Promise.resolve()
  window.history.replaceState(null, "", "/")
})

const renderRun = () => renderSection({ query: "?console=log" }).user
const undoResult = () => screen.getByRole("status", { name: "Undo result" })
const logText = () =>
  within(screen.getByRole("list", { name: "Log" }))
    .queryAllByRole("listitem")
    .map((row) => row.textContent)

async function runWithAllow(user: User) {
  await press(user, "Run")
  const ask = await gate()
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await until(() => expect(logText()).toContain("agentVisibility → Public"))
  await until(() => expect(screen.getByRole("button", { name: "Stop" })).toBeDisabled())
}

test("when undo fails, Undo agent comes back and the error shows", async () => {
  const user = renderRun()
  await runWithAllow(user)
  undo.fail = new Error("history went away")
  await press(user, "Undo agent")
  await until(() => expect(undoResult()).toHaveTextContent("Couldn't undo the agent: history went away"))
  expect(screen.getByRole("button", { name: "Undo agent" })).toBeEnabled()
})

test("Reset while an undo is still settling: its stale result never lands", async () => {
  const user = renderRun()
  await runWithAllow(user)
  let resolve = () => {}
  const promise = new Promise<void>((done) => (resolve = done))
  undo.hold = promise
  await press(user, "Undo agent")
  const ask = await gate()
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await gateClosed()
  await press(user, "Reset")
  expect(screen.getByRole("button", { name: "Run" })).toBeEnabled()
  resolve()
  await promise
  await new Promise((settle) => setTimeout(settle, 0))
  expect(undoResult()).toBeEmptyDOMElement()
})
