import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { agent } from "../agent.ts"
import { App } from "../App.tsx"

const SENTENCE = "Changes who can see Apollo"
const setVisibility = (value: string, signal?: AbortSignal) =>
  agent.act(
    { steps: [{ ref: "Visibility", action: "setValue", args: [value] }] },
    { signal }
  )

test("shows the page heading and a captioned Agent run section", () => {
  render(<App />)
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  expect(
    screen.getByRole("heading", { level: 1, name: "UI SDK Hello World" })
  ).toBeInTheDocument()
  expect(screen.getByRole("region", { name: "Agent run" })).toHaveAccessibleDescription()
})

test("an agent's risky step needs a person: refused on no, runs on yes", async () => {
  const user = userEvent.setup()
  render(<App />)
  const visibility = () => screen.getByRole("combobox", { name: "Visibility" })

  const refused = setVisibility("public")
  const ask = await screen.findByRole("alertdialog", {
    name: "Let the agent continue?",
  })
  expect(ask).toHaveAccessibleDescription(SENTENCE)
  await user.click(screen.getByRole("button", { name: "Refuse" }))
  expect((await refused).error?.message).toMatch(/The person said no to/)
  expect(visibility()).toHaveTextContent("Private")

  const allowed = setVisibility("public")
  await screen.findByRole("alertdialog", { name: "Let the agent continue?" })
  await user.click(screen.getByRole("button", { name: "Allow" }))
  expect((await allowed).ok).toBe(true)
  await waitFor(() => expect(visibility()).toHaveTextContent("Public"))
})

test("aborting a step closes the prompt waiting on the person", async () => {
  render(<App />)
  const controller = new AbortController()

  const run = setVisibility("public", controller.signal)
  await screen.findByRole("alertdialog", { name: "Let the agent continue?" })

  controller.abort()

  await waitFor(() =>
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  )
  expect((await run).ok).toBe(false)
  expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveTextContent(
    "Private"
  )
})
