import { render, screen } from "@testing-library/react"
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

test("the color scheme control is present", () => {
  render(<App />)
  expect(screen.getByText("Theme")).toBeInTheDocument()
  expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument()
})

test("the page has at most one h1", () => {
  render(<App />)
  expect(
    screen.queryAllByRole("heading", { level: 1 }).length
  ).toBeLessThanOrEqual(1)
})
