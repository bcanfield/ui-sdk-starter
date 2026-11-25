import { confirm } from "@ui-sdk/react/alert-dialog"
import { createAgent, registerTools } from "@ui-sdk/react/agent"

type Allow = NonNullable<NonNullable<Parameters<typeof createAgent>[0]>["allow"]>
type Answer = { confirm: string; allowed: boolean }

const answerListeners = new Set<(answer: Answer) => void>()

// Only the person's own Allow or Refuse is reported. The bridge aborts `signal` both when the act's own
// signal aborts and when its allow timeout runs out; either closes the ask with no, and neither is reported.
function onAnswer(listener: (answer: Answer) => void) {
  answerListeners.add(listener)
  return () => {
    answerListeners.delete(listener)
  }
}

const askPerson: Allow = async (step, { signal }) => {
  if (!step.confirm) return true
  const close = () => confirm.controller.close()
  signal.addEventListener("abort", close, { once: true })
  try {
    const allowed = await confirm({
      title: "Let the agent continue?",
      description: step.confirm,
      confirmLabel: "Allow",
      cancelLabel: "Refuse",
    })
    if (!signal.aborted) {
      for (const listener of answerListeners) {
        // A listener's bug must not turn the person's answer into a failed step.
        try {
          listener({ confirm: step.confirm, allowed })
        } catch (error) {
          console.error(error)
        }
      }
    }
    return allowed
  } finally {
    signal.removeEventListener("abort", close)
  }
}

const agent = createAgent({ allow: askPerson })

if (import.meta.env.DEV) {
  Object.assign(window, { agent })
}

// The bridge's own allow already asks the person, so asking again here would double every prompt.
const unregister = registerTools(agent, { allow: () => true })

if (import.meta.hot) {
  import.meta.hot.dispose(unregister)
}

export { agent, askPerson, onAnswer, type Answer }
