import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test } from "vitest"
import { agent } from "../agent.ts"
import { CoreSection } from "./core-section.tsx"

afterEach(() => window.history.replaceState(null, "", "/"))

const section = () => screen.getByRole("region", { name: "Built from core" })
const markTrigger = () => within(screen.getByRole("group", { name: "Project mark" })).getByRole("button")

test("shows the picker, its keyboard legend, its source and a shipped Range tabs", () => {
  render(<CoreSection />)
  expect(section()).toHaveAttribute("id", "core")
  expect(markTrigger()).toHaveTextContent("Leaf")
  expect(within(section()).getByRole("tablist", { name: "Range" })).toBeInTheDocument()
  for (const name of ["Day", "Week", "Month"]) {
    expect(screen.getByRole("tab", { name })).toBeInTheDocument()
  }
  expect(screen.getByRole("link", { name: /source/i })).toHaveAttribute(
    "href",
    expect.stringMatching(/src\/showcase\/project-mark\/project-mark\.ts$/)
  )
  const legend = screen.getByRole("list", { name: "Keyboard" })
  for (const key of ["Enter", "Space", "Esc", "Home", "End"]) {
    expect(within(legend).getByText(key)).toBeInTheDocument()
  }
})

test("a person picks a mark with the keyboard and focus returns to the trigger", async () => {
  const user = userEvent.setup()
  render(<CoreSection />)
  await user.click(markTrigger())
  await user.keyboard("launch")
  expect(screen.getAllByRole("option")).toHaveLength(1)
  await user.keyboard("{Enter}")
  expect(markTrigger()).toHaveTextContent("Rocket")
  expect(markTrigger()).toHaveFocus()
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
})

test("the agent sees the project mark and sets it to rocket through its agent key", async () => {
  render(<CoreSection />)
  const entry = agent.snapshot().find((e) => e.label === "Project mark")
  expect(entry).toMatchObject({ component: "project-mark", actions: ["setValue"], value: "leaf" })

  const result = await agent.act({
    steps: [{ ref: "Project mark", action: "setValue", args: ["rocket"] }],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(markTrigger()).toHaveTextContent("Rocket")

  const refused = await agent.act({
    steps: [{ ref: "Project mark", action: "setValue", args: ["spaceship"] }],
  })
  expect(refused.ok).toBe(false)
  expect(markTrigger()).toHaveTextContent("Rocket")
})

test("?dir=rtl sets direction on the section only", () => {
  window.history.replaceState(null, "", "/?dir=rtl")
  render(<CoreSection />)
  expect(section()).toHaveAttribute("dir", "rtl")
  expect(document.documentElement).not.toHaveAttribute("dir")
  expect(screen.getByRole("button", { name: "Right to left" })).toHaveAttribute("aria-pressed", "true")
})

test("the direction toggle flips the section and writes ?dir to the URL", async () => {
  const user = userEvent.setup()
  render(<CoreSection />)
  expect(section()).not.toHaveAttribute("dir", "rtl")

  await user.click(screen.getByRole("button", { name: "Right to left" }))
  expect(section()).toHaveAttribute("dir", "rtl")
  expect(new URL(window.location.href).searchParams.get("dir")).toBe("rtl")

  await user.click(screen.getByRole("button", { name: "Right to left" }))
  expect(section()).not.toHaveAttribute("dir", "rtl")
  expect(new URL(window.location.href).searchParams.has("dir")).toBe(false)
})

test("back and forward restore the direction", async () => {
  render(<CoreSection />)
  window.history.pushState(null, "", "/?dir=rtl")
  window.dispatchEvent(new PopStateEvent("popstate"))
  expect(await screen.findByRole("region", { name: "Built from core" })).toHaveAttribute("dir", "rtl")
})
