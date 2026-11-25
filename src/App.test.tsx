import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test } from "vitest"
import { agent } from "./agent.ts"
import { App } from "./App.tsx"
import { colorScheme } from "./theme/color-scheme.ts"

afterEach(() => {
  colorScheme.set("system")
  localStorage.clear()
})

test("a skip link leads to the main landmark", () => {
  render(<App />)
  expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
    "href",
    "#content"
  )
  expect(document.getElementById("content")).toBe(screen.getByRole("main"))
})

test("the top bar holds the brand mark and the color scheme control", () => {
  render(<App />)
  const bar = screen.getByRole("banner")
  expect(bar).toHaveTextContent(/^ui-sdk/)
  expect(within(bar).getByText("Theme")).toBeInTheDocument()
  expect(within(bar).getByRole("radio", { name: "Dark" })).toBeInTheDocument()
})

test("the page has at most one h1", () => {
  render(<App />)
  expect(
    screen.queryAllByRole("heading", { level: 1 }).length
  ).toBeLessThanOrEqual(1)
})

test("choosing a theme sets data-color-scheme on <html> and saves it", async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(within(screen.getByRole("banner")).getByRole("radio", { name: "Dark" }))
  expect(document.documentElement).toHaveAttribute("data-color-scheme", "dark")
  expect(localStorage.getItem("color-scheme")).toContain("dark")
  const result = await agent.act({ steps: [{ ref: "Theme", action: "setValue", args: ["light"] }] })
  expect(result.ok, result.error?.message).toBe(true)
  expect(document.documentElement).toHaveAttribute("data-color-scheme", "light")
})
