import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test } from "vitest"
import { agent } from "./agent.ts"
import { App } from "./App.tsx"
import { colorScheme } from "./theme/color-scheme.ts"

afterEach(() => {
  colorScheme.set("system")
  localStorage.clear()
})

test("shows the page heading and one captioned section per SDK concept", () => {
  render(<App />)
  expect(
    screen.getByRole("heading", { level: 1, name: "UI SDK Hello World" })
  ).toBeInTheDocument()

  for (const name of ["First component", "Settings form", "Agent bridge"]) {
    expect(screen.getByRole("region", { name })).toHaveAccessibleDescription()
  }
})

test("an agent's risky step needs a person: refused on no, runs on yes", async () => {
  const user = userEvent.setup()
  render(<App />)
  const result = () => screen.getByRole("status", { name: "Agent result" })
  const settings = () => screen.getByRole("status", { name: "Settings result" })

  await user.click(screen.getByRole("button", { name: "Run risky agent step" }))
  const ask = await screen.findByRole("alertdialog", {
    name: "Let the agent continue?",
  })
  expect(ask).toHaveAccessibleDescription(
    "Deletes the project and all its data"
  )
  await user.click(screen.getByRole("button", { name: "Refuse" }))
  await waitFor(() =>
    expect(result()).toHaveTextContent(/The person said no to/)
  )
  expect(screen.getByRole("button", { name: "Run risky agent step" })).toHaveFocus()
  expect(settings()).toBeEmptyDOMElement()

  await user.click(screen.getByRole("button", { name: "Run risky agent step" }))
  await screen.findByRole("alertdialog", { name: "Let the agent continue?" })
  await user.click(screen.getByRole("button", { name: "Allow" }))
  await waitFor(() =>
    expect(result()).toHaveTextContent("Agent deleted the project")
  )
  expect(settings()).toHaveTextContent("Apollo was deleted")
})

test("aborting a step closes the prompt waiting on the person", async () => {
  const user = userEvent.setup()
  render(<App />)
  const controller = new AbortController()

  const run = agent.act(
    {
      steps: [
        { ref: "Delete project", action: "press", args: ["Delete forever"] },
      ],
    },
    { signal: controller.signal }
  )
  await screen.findByRole("alertdialog", { name: "Let the agent continue?" })

  controller.abort()

  await waitFor(() =>
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  )
  expect((await run).ok).toBe(false)
  await user.click(screen.getByRole("button", { name: "Delete project" }))
  expect(
    await screen.findByRole("alertdialog", { name: "Delete Apollo?" })
  ).toBeInTheDocument()
})

test("an agent finds every control on the page by a name of its own", async () => {
  render(<App />)

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
  for (const label of [
    "Bookmark",
    "Project name",
    "Visibility",
    "Weekly digest",
    "Save settings",
    "Delete project",
    "Mute",
    "Run agent demo",
    "Run risky agent step",
  ]) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label)
  }
  expect(new Set(labels).size, "two controls share a label").toBe(labels.length)

  const result = await agent.act({
    steps: [{ ref: "Bookmark", action: "setPressed", args: [true] }],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole("button", { name: "Bookmark" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
})

test("choosing a theme sets data-color-scheme on <html> and saves it", async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole("radio", { name: "Dark" }))
  expect(document.documentElement).toHaveAttribute("data-color-scheme", "dark")
  expect(localStorage.getItem("color-scheme")).toContain("dark")
  const result = await agent.act({ steps: [{ ref: "Theme", action: "setValue", args: ["light"] }] })
  expect(result.ok, result.error?.message).toBe(true)
  expect(document.documentElement).toHaveAttribute("data-color-scheme", "light")
})

test("the skip link jumps to the main content", () => {
  render(<App />)
  const link = screen.getByRole("link", { name: "Skip to content" })
  expect(link).toHaveAttribute("href", "#content")
  expect(document.getElementById("content")).toBe(screen.getByRole("main"))
})
