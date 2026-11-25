import { getConfig, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OverlayHost } from "@ui-sdk/react/overlays"
import { onTestFailed, onTestFinished } from "vitest"
import { AgentRunSection } from "./agent-run-section.tsx"
import type { Pacing } from "./use-plan-player.ts"

type User = ReturnType<typeof userEvent.setup>

const instant: Pacing = { leadIn: 0, between: 0 }

function renderRun({ query = "", pacing = instant }: { query?: string; pacing?: Pacing } = {}) {
  window.history.replaceState(null, "", `/${query}`)
  const user = userEvent.setup()
  const { container, rerender } = render(
    <>
      <AgentRunSection pacing={pacing} />
      <OverlayHost />
    </>
  )
  // The section leaves the page and the shell's OverlayHost stays, as in the app.
  const leave = () =>
    rerender(
      <>
        {null}
        <OverlayHost />
      </>
    )
  return { user, container, leave }
}

// Waits until `check` passes, with no deadline of its own: a run's length grows with machine load, so the
// test timeout catches a hang instead, and then the last failed check is printed.
function until<T>(check: () => T): Promise<T> {
  return getConfig().asyncWrapper(
    () =>
      new Promise<T>((resolve) => {
        let last: unknown
        let done = false
        let queued: ReturnType<typeof setTimeout> | undefined
        const stop = () => {
          done = true
          observer.disconnect()
          clearInterval(poll)
          clearTimeout(queued)
        }
        const attempt = () => {
          queued = undefined
          if (done) return
          try {
            const value = check()
            stop()
            resolve(value)
          } catch (error) {
            last = error
          }
        }
        // A run makes hundreds of changes, and a check per change would compete with the run for the CPU.
        // One check per task after a burst sees the same end state.
        const observer = new MutationObserver(() => {
          queued ??= setTimeout(attempt, 0)
        })
        observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true })
        // Some state (the bridge's snapshot) isn't in the DOM, so look again now and then too.
        const poll = setInterval(attempt, 50)
        onTestFailed(() => {
          if (!done) console.error("until: still waiting on", last)
        })
        onTestFinished(stop)
        attempt()
      })
  )
}

const press = (user: User, name: string) => user.click(screen.getByRole("button", { name }))

const gate = () => until(() => screen.getByRole("alertdialog", { name: "Let the agent continue?" }))

const gateClosed = () =>
  until(() => {
    if (screen.queryByRole("alertdialog")) throw new Error("the confirm dialog is still open")
  })

export { gate, gateClosed, press, renderRun, until, type User }
