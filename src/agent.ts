import { confirm } from "@ui-sdk/react/alert-dialog"
import { createAgent, registerTools } from "@ui-sdk/react/agent"

const agent = createAgent({
  allow: (step, { signal }) => {
    if (!step.confirm) return true
    signal.addEventListener("abort", () => confirm.controller.close(), {
      once: true,
    })
    return confirm({
      title: "Let the agent continue?",
      description: step.confirm,
      confirmLabel: "Allow",
      cancelLabel: "Refuse",
    })
  },
})

if (import.meta.env.DEV) {
  Object.assign(window, { agent })
}

// The bridge's own allow already asks the person, so asking again here would double every prompt.
const unregister = registerTools(agent, { allow: () => true })

if (import.meta.hot) {
  import.meta.hot.dispose(unregister)
}

export { agent }
