import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { agent } from "../agent.ts"
import { SettingsSection } from "./settings-section.tsx"

test("saving reports the values a person chose", async () => {
  const user = userEvent.setup()
  render(<SettingsSection />)

  const name = screen.getByLabelText("Project name")
  await user.clear(name)
  await user.type(name, "Atlas")

  await user.click(screen.getByRole("combobox", { name: "Visibility" }))
  await user.click(await screen.findByRole("option", { name: "Internal" }))

  await user.click(screen.getByRole("switch", { name: "Weekly digest" }))
  await user.click(screen.getByRole("button", { name: "Save settings" }))

  expect(await screen.findByRole("status", { name: "Settings result" })).toHaveTextContent(
    "Saved Atlas: internal, weekly digest off"
  )
})

test("an empty project name is not saved", async () => {
  const user = userEvent.setup()
  render(<SettingsSection />)

  await user.clear(screen.getByLabelText("Project name"))
  await user.click(screen.getByRole("button", { name: "Save settings" }))

  expect(screen.getByRole("status", { name: "Settings result" })).toBeEmptyDOMElement()
})

test("Cancel keeps the project; Delete forever removes it", async () => {
  const user = userEvent.setup()
  render(<SettingsSection />)
  const trigger = screen.getByRole("button", { name: "Delete project" })

  await user.click(trigger)
  const dialog = await screen.findByRole("alertdialog", {
    name: "Delete Apollo?",
  })
  expect(dialog).toHaveAccessibleDescription()
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
  expect(screen.queryByText("Apollo was deleted")).not.toBeInTheDocument()

  await user.click(trigger)
  await user.click(
    await screen.findByRole("button", { name: "Delete forever" })
  )
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
  expect(
    screen.getByRole("status", { name: "Settings result" })
  ).toHaveTextContent("Apollo was deleted")
})

test("the delete dialog names the current project", async () => {
  const user = userEvent.setup()
  render(<SettingsSection />)

  const name = screen.getByLabelText("Project name")
  await user.clear(name)
  await user.type(name, "Atlas")
  await user.click(screen.getByRole("button", { name: "Delete project" }))

  expect(
    await screen.findByRole("alertdialog", { name: "Delete Atlas?" })
  ).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Delete forever" }))
  expect(
    screen.getByRole("status", { name: "Settings result" })
  ).toHaveTextContent("Atlas was deleted")
})

test("an agent can find and change every setting", async () => {
  render(<SettingsSection />)

  const components = agent
    .snapshot()
    .filter((entry) => !entry.offPage && entry.component !== "more")
  for (const entry of components) {
    expect(
      entry.label,
      `${entry.component} ${entry.ref} has no name`
    ).toBeTruthy()
  }
  const labels = components.map((entry) => entry.label)
  for (const label of ["Project name", "Visibility", "Weekly digest"]) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label)
  }

  const result = await agent.act({
    steps: [
      { ref: "Project name", action: "setValue", args: ["Atlas"] },
      { ref: "Visibility", action: "setValue", args: ["Internal"] },
      { ref: "Weekly digest", action: "setChecked", args: [false] },
    ],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByLabelText<HTMLInputElement>("Project name").value).toBe(
    "Atlas"
  )
  expect(screen.getByRole("switch", { name: "Weekly digest" })).not.toBeChecked()
  expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveTextContent(
    "Internal"
  )
})

test("Space toggles the weekly digest switch", async () => {
  const user = userEvent.setup()
  render(<SettingsSection />)
  const digest = screen.getByRole("switch", { name: "Weekly digest" })

  await user.tab()
  await user.tab()
  await user.tab()
  expect(digest).toHaveFocus()
  expect(digest).toBeChecked()

  await user.keyboard(" ")
  expect(digest).not.toBeChecked()
  await user.keyboard(" ")
  expect(digest).toBeChecked()
})
