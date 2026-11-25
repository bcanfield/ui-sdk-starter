import { fireEvent, screen, within } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { gate, gateClosed, press, renderRun, until, type User } from "./run-kit.tsx"

afterEach(() => window.history.replaceState(null, "", "/"))

const button = (name: string) => screen.getByRole("button", { name })
const idle = () => until(() => expect(button("Stop")).toBeDisabled())
// jsdom doesn't make the page inert behind the dialog, so a test can switch tabs while it asks.
const openTab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }))
const undoButton = () => {
  openTab("Log")
  return button("Undo agent")
}
const runStepButton = () => {
  openTab("Plan")
  return button("Run step")
}

function ownStep(steps: unknown) {
  openTab("Plan")
  fireEvent.input(screen.getByRole("textbox", { name: "Run your own step" }), {
    target: { value: JSON.stringify({ steps }) },
  })
  fireEvent.click(button("Run step"))
}

const makePublic = [{ ref: "Visibility", action: "setValue", args: ["public"] }]

async function stepTwice(user: User) {
  await press(user, "Step")
  await idle()
  await press(user, "Step")
  await idle()
}

test("while the plan holds the bridge, Run step and Undo agent are disabled", async () => {
  const { user } = renderRun()
  await stepTwice(user)
  expect(undoButton()).toBeEnabled()
  expect(runStepButton()).toBeEnabled()

  await press(user, "Run")
  const ask = await gate()
  expect(runStepButton()).toBeDisabled()
  expect(undoButton()).toBeDisabled()

  await user.click(within(ask).getByRole("button", { name: "Refuse" }))
  await idle()
  expect(runStepButton()).toBeEnabled()
  expect(undoButton()).toBeEnabled()
})

test("while an own step holds the bridge, Run, Step, Reset and Undo agent are disabled", async () => {
  const { user } = renderRun()
  await stepTwice(user)

  ownStep(makePublic)
  const ask = await gate()
  expect(button("Run")).toBeDisabled()
  expect(button("Step")).toBeDisabled()
  // An own step takes no signal, so Reset can't stop it.
  expect(button("Reset")).toBeDisabled()
  expect(runStepButton()).toBeDisabled()
  expect(undoButton()).toBeDisabled()

  await user.click(within(ask).getByRole("button", { name: "Refuse" }))
  await until(() => expect(button("Run")).toBeEnabled())
  expect(button("Step")).toBeEnabled()
  expect(button("Reset")).toBeEnabled()
  expect(undoButton()).toBeEnabled()
  expect(runStepButton()).toBeEnabled()
})

test("while an undo holds the bridge, Run, Step, Run step and Reset are disabled", async () => {
  const { user } = renderRun()
  await stepTwice(user)
  ownStep(makePublic)
  await user.click(within(await gate()).getByRole("button", { name: "Allow" }))
  await gateClosed()
  await until(() => expect(undoButton()).toBeEnabled())

  // Putting Visibility back asks the person again, so the undo is in flight while the dialog is open.
  fireEvent.click(undoButton())
  const ask = await gate()
  expect(button("Run")).toBeDisabled()
  expect(button("Step")).toBeDisabled()
  expect(button("Reset")).toBeDisabled()
  expect(undoButton()).toBeDisabled()
  expect(runStepButton()).toBeDisabled()

  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  await until(() => expect(button("Reset")).toBeEnabled())
  expect(button("Run")).toBeEnabled()
  expect(button("Step")).toBeEnabled()
  expect(runStepButton()).toBeEnabled()
  openTab("Log")
  expect(screen.getByRole("status", { name: "Undo result" })).toHaveTextContent(
    "Agent's changes undone. Yours stayed."
  )
})
