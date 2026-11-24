import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { ToggleSection } from "./toggle-section.tsx"

test("Bookmark toggles on and off with the mouse and keyboard", async () => {
  const user = userEvent.setup()
  render(<ToggleSection />)

  const bookmark = screen.getByRole("button", { name: "Bookmark" })
  expect(bookmark).toHaveAttribute("aria-pressed", "false")

  await user.click(bookmark)
  expect(bookmark).toHaveAttribute("aria-pressed", "true")

  await user.keyboard("{Enter}")
  expect(bookmark).toHaveAttribute("aria-pressed", "false")

  await user.keyboard(" ")
  expect(bookmark).toHaveAttribute("aria-pressed", "true")
})
