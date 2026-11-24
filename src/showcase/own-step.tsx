import { Button } from "@ui-sdk/react/button"
import { Field, FieldLabel } from "@ui-sdk/react/field"
import { Textarea } from "@ui-sdk/react/textarea"
import { useState } from "react"
import { agent } from "../agent.ts"
import { describeChanges } from "./plan.ts"

const example = JSON.stringify(
  { steps: [{ ref: "Project name", action: "setValue", args: ["Apollo Edge"] }] },
  null,
  2
)

type Act = Parameters<typeof agent.act>[0]

function OwnStep({ disabled }: { disabled: boolean }) {
  const [text, setText] = useState(example)
  const [result, setResult] = useState("")
  const [busy, setBusy] = useState(false)

  async function run() {
    let call: unknown
    try {
      call = JSON.parse(text)
    } catch (error) {
      setResult(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`)
      return
    }
    setBusy(true)
    setResult("")
    const outcome = await agent.act(call as Act)
    setBusy(false)
    if (outcome.ok) {
      const changes = describeChanges(outcome.steps.flatMap((s) => s.changes ?? []))
      setResult(`ok: ${changes || "Holds."}`)
    } else {
      setResult(`error: ${outcome.error?.message}`)
    }
  }

  return (
    <div className="own-step">
      <Field>
        <FieldLabel>Run your own step</FieldLabel>
        <Textarea
          className="own-step-input"
          rows={7}
          spellCheck={false}
          value={text}
          onValueChange={(value) => setText(value)}
        />
      </Field>
      <div className="log-actions">
        <Button onClick={run} disabled={disabled || busy}>
          Run step
        </Button>
        <output className="run-result own-step-result" aria-label="Own step result">
          {result}
        </output>
      </div>
    </div>
  )
}

export { OwnStep }
