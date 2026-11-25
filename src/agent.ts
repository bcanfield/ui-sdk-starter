import { confirm } from "@ui-sdk/react/alert-dialog"
import { createAgent, registerTools } from "@ui-sdk/react/agent"

type Allow = NonNullable<NonNullable<Parameters<typeof createAgent>[0]>["allow"]>

const askPerson: Allow = async (step, { signal }) => {
  if (!step.confirm) return true
  const close = () => confirm.controller.close()
  signal.addEventListener("abort", close, { once: true })
  try {
    return await confirm({
      title: "Let the agent continue?",
      description: step.confirm,
      confirmLabel: "Allow",
      cancelLabel: "Refuse",
    })
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

export { agent, askPerson }
