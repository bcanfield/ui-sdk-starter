// Own file: agent.ts acts on import, so it is imported after the stub, once per file.
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"

type Tool = { name: string; execute: (input: object) => Promise<unknown> }

test("a confirm-marked step from a WebMCP tool still asks the person", async () => {
  const user = userEvent.setup()
  const tools = new Map<string, Tool>()
  Object.assign(document, {
    modelContext: {
      registerTool: async (tool: Tool) => {
        tools.set(tool.name, tool)
      },
    },
  })

  const { agent } = await import("./agent.ts")
  const { App } = await import("./App.tsx")
  render(<App />)

  expect((window as unknown as { agent: unknown }).agent).toBe(agent)
  expect([...tools.keys()].sort()).toEqual(["act", "query", "snapshot"])

  const run = tools.get("act")!.execute({
    steps: [{ ref: "Delete project", action: "press", args: ["Delete forever"] }],
  })
  await screen.findByRole("alertdialog", { name: "Let the agent continue?" })
  await user.click(screen.getByRole("button", { name: "Refuse" }))

  expect(JSON.stringify(await run)).toContain("The person said no to")
  expect(screen.getByRole("status", { name: "Settings result" })).toBeEmptyDOMElement()
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
})
