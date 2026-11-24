import { Button } from "@ui-sdk/react/button"
import { Toggle } from "@ui-sdk/react/toggle"
import { useState } from "react"
import { agent } from "../agent.ts"
import { Section } from "./section.tsx"

function AgentSection() {
  const [muted, setMuted] = useState(false)
  const [outcome, setOutcome] = useState("")

  async function runDemo() {
    const result = await agent.act({
      steps: [{ ref: "Mute", action: "setPressed", args: [!muted] }],
    })
    setOutcome(
      result.ok ? "Agent step succeeded" : `Agent step failed: ${result.error?.message}`
    )
  }

  async function runRiskyStep() {
    const result = await agent.act({
      steps: [
        { ref: "Delete project", action: "press", args: ["Delete forever"] },
      ],
    })
    setOutcome(
      result.ok
        ? "Agent deleted the project"
        : `Agent step refused: ${result.error?.message}`
    )
  }

  return (
    <Section
      title="Agent bridge"
      caption="createAgent lets an agent read and drive these components by name through their actions. Anything marked data-agent-confirm waits for a person. registerTools offers the bridge to WebMCP browsers, and under pnpm dev it is also window.agent in the console."
    >
      <div className="row">
        <Toggle pressed={muted} onPressedChange={setMuted}>
          Mute
        </Toggle>
        <output aria-label="Sound state">
          {muted ? "Sound is off" : "Sound is on"}
        </output>
      </div>
      <div className="row">
        <Button onClick={runDemo}>Run agent demo</Button>
        <Button onClick={runRiskyStep}>Run risky agent step</Button>
      </div>
      <output aria-label="Agent result">{outcome}</output>
    </Section>
  )
}

export { AgentSection }
