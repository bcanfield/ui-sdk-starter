import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { agent } from "../agent.ts"
import { AgentSection } from "./agent-section.tsx"

test("an agent can find and change every control in the section", async () => {
  render(<AgentSection />)

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
  for (const label of ["Mute", "Run agent demo"]) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label)
  }

  const result = await agent.act({
    steps: [{ ref: "Mute", action: "setPressed", args: [true] }],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole("button", { name: "Mute" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  expect(screen.getByRole("status", { name: "Sound state" })).toHaveTextContent(
    "Sound is off"
  )
})

test("the demo button drives the toggle through the bridge, both ways", async () => {
  const user = userEvent.setup()
  render(<AgentSection />)
  const mute = screen.getByRole("button", { name: "Mute" })
  const sound = screen.getByRole("status", { name: "Sound state" })
  const result = screen.getByRole("status", { name: "Agent result" })

  const changes: { label?: string; source?: string }[] = []
  const stop = agent.subscribe((change) => changes.push(change))

  await user.click(screen.getByRole("button", { name: "Run agent demo" }))
  await waitFor(() => expect(mute).toHaveAttribute("aria-pressed", "true"))
  expect(changes).toContainEqual(
    expect.objectContaining({ label: "Mute", source: "agent" })
  )
  stop()
  expect(sound).toHaveTextContent("Sound is off")
  await waitFor(() => expect(result).toHaveTextContent("Agent step succeeded"))

  await user.click(screen.getByRole("button", { name: "Run agent demo" }))
  await waitFor(() => expect(mute).toHaveAttribute("aria-pressed", "false"))
  expect(sound).toHaveTextContent("Sound is on")
})
