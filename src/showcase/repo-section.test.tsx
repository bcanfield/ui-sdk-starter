import { render, screen, within } from "@testing-library/react"
import { expect, test } from "vitest"
import readme from "../../README.md?raw"
import { RepoSection, STRIP } from "./repo-section.tsx"

test("shows a non-empty excerpt of the real agent test", () => {
  render(<RepoSection />)
  const region = screen.getByRole("region", { name: "In the repo" })
  expect(region).toHaveAttribute("id", "repo")
  const code = within(region).getByLabelText("Agent test excerpt")
  expect(code.textContent?.trim()).not.toBe("")
  expect(code).toHaveTextContent("agent.act")
  expect(code).not.toHaveTextContent("excerpt:")
})

test("lists the four helpers, each linked, and checkServer to the docs", () => {
  render(<RepoSection />)
  const list = screen.getByRole("list", { name: "Testing helpers" })
  for (const name of ["mount", "checkDirection", "checkPattern", "checkServer"]) {
    expect(within(list).getByRole("link", { name })).toHaveAttribute("href", expect.stringMatching(/^https:/))
  }
  expect(within(list).getByRole("link", { name: "checkServer" })).toHaveAttribute(
    "href",
    expect.stringContaining("ui-sdk.dev")
  )
})

test("the strip instructions match the README word for word", () => {
  render(<RepoSection />)
  const shown = screen.getByText(/^Delete the/, { selector: "p" }).textContent ?? ""
  expect(shown.toLowerCase()).toBe(STRIP.replaceAll("`", "").toLowerCase())
  expect(readme.replace(/`/g, "").replace(/\s+/g, " ")).toContain(STRIP)
})
