// Own file: agent.ts acts on import, so it is imported after the stub, once per file.
import { expect, test, vi } from "vitest"

test("window.agent is only exposed under the dev server", async () => {
  vi.stubEnv("DEV", false)
  await import("./agent.ts")
  expect("agent" in window).toBe(false)
})
