import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test } from "vitest"
import { agent } from "../agent.ts"
import { ColorSchemeControl } from "./color-scheme-control.tsx"
import { Preferences } from "@ui-sdk/react/preferences"
import { colorScheme } from "./color-scheme.ts"

afterEach(() => {
  colorScheme.set("system")
  localStorage.clear()
})

test("choosing a theme sets data-color-scheme on <html> and saves it", async () => {
  const user = userEvent.setup()
  render(<Preferences preferences={[colorScheme]}><ColorSchemeControl /></Preferences>)
  await user.click(screen.getByRole("radio", { name: "Dark" }))
  expect(document.documentElement).toHaveAttribute("data-color-scheme", "dark")
  expect(localStorage.getItem("color-scheme")).toContain("dark")
  const result = await agent.act({ steps: [{ ref: "Theme", action: "setValue", args: ["light"] }] })
  expect(result.ok, result.error?.message).toBe(true)
  expect(document.documentElement).toHaveAttribute("data-color-scheme", "light")
})
