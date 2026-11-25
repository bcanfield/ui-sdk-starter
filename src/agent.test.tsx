import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { confirm } from "@ui-sdk/react/alert-dialog"
import { Button } from "@ui-sdk/react/button"
import { useState } from "react"
import { expect, test } from "vitest"
import { agent, askPerson, onAnswer, type Answer } from "./agent.ts"
import { App } from "./App.tsx"

const ASK = "Let the agent continue?"

// Test-local, so these shell checks hold with or without the showcase.
function ConfirmMarkedControl() {
  const [erased, setErased] = useState(false)
  return (
    <>
      <Button data-agent-confirm="Erases every saved draft" onClick={() => setErased(true)}>
        Erase drafts
      </Button>
      <output aria-label="Erase result">{erased ? "Erased" : ""}</output>
    </>
  )
}

function renderShell() {
  render(
    <>
      <App />
      <ConfirmMarkedControl />
    </>
  )
}

test("aborting an act's signal while its confirm is open closes the dialog and presses nothing", async () => {
  renderShell()
  const controller = new AbortController()
  const run = agent.act(
    { steps: [{ ref: "Erase drafts", action: "press" }] },
    { signal: controller.signal }
  )
  await screen.findByRole("alertdialog", { name: ASK })

  controller.abort()

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
  expect((await run).ok).toBe(false)
  expect(screen.getByRole("status", { name: "Erase result" })).toBeEmptyDOMElement()
})

test("onAnswer reports the person's Refuse, and not an abort that closed the ask", async () => {
  const user = userEvent.setup()
  renderShell()
  const answers: Answer[] = []
  const stop = onAnswer((answer) => answers.push(answer))
  const press = (signal?: AbortSignal) =>
    agent.act({ steps: [{ ref: "Erase drafts", action: "press" }] }, { signal })

  const controller = new AbortController()
  const aborted = press(controller.signal)
  await screen.findByRole("alertdialog", { name: ASK })
  controller.abort()
  await aborted
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
  expect(answers).toEqual([])

  const refused = press()
  const ask = await screen.findByRole("alertdialog", { name: ASK })
  await user.click(within(ask).getByRole("button", { name: "Refuse" }))
  await refused
  stop()
  expect(answers).toEqual([{ confirm: "Erases every saved draft", allowed: false }])
})

test("a settled ask stops listening to its signal, so a later abort can't close another dialog", async () => {
  const user = userEvent.setup()
  renderShell()
  const controller = new AbortController()
  const step = {
    ref: "c1",
    component: "button",
    action: "press",
    args: [],
    confirm: "Erases every saved draft",
  }
  const asked = askPerson(step, { signal: controller.signal })
  const ask = await screen.findByRole("alertdialog", { name: ASK })
  await user.click(within(ask).getByRole("button", { name: "Allow" }))
  expect(await asked).toBe(true)
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())

  const later = confirm({ title: "Something else?", confirmLabel: "Yes", cancelLabel: "No" })
  const other = await screen.findByRole("alertdialog", { name: "Something else?" })
  controller.abort()
  await new Promise((settle) => setTimeout(settle, 0))
  expect(screen.getByRole("alertdialog", { name: "Something else?" })).toBe(other)
  await user.click(within(other).getByRole("button", { name: "No" }))
  expect(await later).toBe(false)
})
