import { Button } from "@ui-sdk/react/button"
import { Field, FieldLabel } from "@ui-sdk/react/field"
import { Textarea } from "@ui-sdk/react/textarea"
import { useState } from "react"
import { agent } from "../agent.ts"
import { messageOf } from "./message-of.ts"
import { describeOutcome } from "./plan.ts"

const example = JSON.stringify(
  { steps: [{ ref: "Project name", action: "setValue", args: ["Apollo Edge"] }] },
  null,
  2
)

type Act = Parameters<typeof agent.act>[0]

function OwnStep({
  disabled,
  onBusyChange,
}: {
  disabled: boolean
  onBusyChange: (busy: boolean) => void
}) {
  const [text, setText] = useState(example)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusyState] = useState(false)

  function setBusy(next: boolean) {
    setBusyState(next)
    onBusyChange(next)
  }

  async function run() {
    let call: unknown
    try {
      call = JSON.parse(text)
    } catch (error) {
      setResult({
        ok: false,
        text: `JSON parse error: ${messageOf(error)}`,
      })
      return
    }
    setBusy(true)
    setResult(null)
    try {
      const outcome = await agent.act(call as Act)
      setResult(
        outcome.ok
          ? { ok: true, text: `ok: ${describeOutcome(outcome)}` }
          : { ok: false, text: `error: ${outcome.error?.message}` }
      )
    } catch (error) {
      setResult({ ok: false, text: `error: ${messageOf(error)}` })
    } finally {
      setBusy(false)
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
        <output
          className="run-result own-step-result"
          aria-label="Own step result"
          data-state={result ? (result.ok ? "ok" : "error") : undefined}
        >
          {result?.text}
        </output>
      </div>
    </div>
  )
}

export { OwnStep }
