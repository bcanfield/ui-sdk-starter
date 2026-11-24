import { render, screen, within } from "@testing-library/react"
import { expect, test } from "vitest"
import { App } from "./App.tsx"

test("a skip link leads to the main landmark", () => {
  render(<App />)
  expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
    "href",
    "#content"
  )
  expect(screen.getByRole("main")).toHaveAttribute("id", "content")
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
