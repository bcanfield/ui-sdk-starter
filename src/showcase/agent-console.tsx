import { Button } from "@ui-sdk/react/button"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs"
import { useState, type RefObject } from "react"
import { PlayButtons } from "./now-playing.tsx"
import { OwnStep } from "./own-step.tsx"
import { callOf, plan, STEP_STATUS, TASK } from "./plan.ts"
import type { usePaneHistory } from "./use-pane-history.ts"
import { usePaneSnapshot } from "./use-pane-snapshot.ts"
import type { PlanPlayer } from "./use-plan-player.ts"
import { useUrlParam } from "./use-url-param.ts"

const TABS = ["plan", "snapshot", "log"] as const

type WebMcpHost = Document & { modelContext?: { registerTool?: unknown } }
const webMcpOffered = () =>
  typeof (document as WebMcpHost).modelContext?.registerTool === "function"
type ConsoleTab = (typeof TABS)[number]

const toTab = (raw: string | null): ConsoleTab => TABS.find((tab) => tab === raw) ?? "plan"
const fromTab = (tab: ConsoleTab) => tab

function AgentConsole({
  player,
  history,
  runGrid,
  playHere,
}: {
  player: PlanPlayer
  history: ReturnType<typeof usePaneHistory>
  runGrid: RefObject<HTMLElement | null>
  playHere: boolean
}) {
  const [tab, selectTab] = useUrlParam("console", toTab, fromTab)
  const [offered] = useState(webMcpOffered)
  const snapshot = usePaneSnapshot(runGrid, player.paneKey, tab === "snapshot")
  const { rows, running, result } = player

  return (
    <div className="console" data-agent-hidden>
      <div className="console-head">
        <span className="eyebrow">agent console</span>
        <span className="webmcp-badge" data-offered={offered}>
          <span aria-hidden="true">{offered ? "●" : "○"}</span>
          {offered ? "WebMCP: tools offered to this browser's agent" : "WebMCP: not detected"}
        </span>
        {playHere && (
          <div className="player">
            <PlayButtons player={player} />
          </div>
        )}
      </div>
      <p className="console-note">
        The agent can't see or press this console. It's scripted: a written plan, no
        model, sent through the real bridge and the real confirm dialog. Each step is its
        own act call, so when one is refused the run carries on with the next. While the
        dialog is asking, it holds the page: Refuse or Esc is how you stop there.
      </p>
      {import.meta.env.DEV && (
        <p className="console-note">
          Dev build: <code>window.agent</code> is this bridge. Try{" "}
          <code>agent.snapshot()</code> in the browser console.
        </p>
      )}
      <Tabs value={tab} onValueChange={(value) => selectTab(toTab(String(value)))}>
        <TabsList aria-label="Console">
          <TabsTab value="plan">Plan</TabsTab>
          <TabsTab value="snapshot">Snapshot</TabsTab>
          <TabsTab value="log">Log</TabsTab>
        </TabsList>
        <TabsPanel value="plan">
          <p className="console-task">{TASK}</p>
          <ol className="steps" aria-label="Plan">
            {plan.map((step, i) => {
              const row = rows[i]!
              return (
                <li key={step.say} className="step" data-state={row.state}>
                  <span className="step-number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="step-body">
                    <span className="step-say">{step.say}</span>
                    <code className="step-call">{callOf(step)}</code>
                    {row.note && <span className="step-note">{row.note}</span>}
                  </div>
                  <span className="eyebrow step-state" data-testid="step-state">
                    {STEP_STATUS[row.state]}
                  </span>
                </li>
              )
            })}
          </ol>
          <output className="run-result" aria-label="Run result">
            {result}
          </output>
          <OwnStep disabled={running} onBusyChange={player.hold} />
        </TabsPanel>
        <TabsPanel value="snapshot">
          <p className="console-task">What the agent sees on the pane, live.</p>
          <pre className="snapshot-block" aria-label="Agent snapshot">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </TabsPanel>
        <TabsPanel value="log">
          <p className="console-task">
            Change anything during or after the run, then undo the agent. Your changes
            stay. Undo may ask you again, and it leaves the Deploy token alone.
          </p>
          <ol className="log" aria-label="Log">
            {history.log.map((entry) => (
              <li key={entry.id} className="log-entry" data-reverted={entry.reverted || undefined}>
                <span className="eyebrow source-tag" data-source={entry.source}>
                  {entry.source}
                </span>
                <span className="log-text">{entry.text}</span>
              </li>
            ))}
          </ol>
          {history.log.length === 0 && (
            <p className="log-empty">No changes yet. Run the plan or edit a field.</p>
          )}
          <div className="log-actions">
            <Button
              onClick={history.undoAgent}
              disabled={player.running || !history.canUndo}
            >
              Undo agent
            </Button>
            <output className="run-result" aria-label="Undo result" title={history.result.title}>
              {history.result.text}
            </output>
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  )
}

export { AgentConsole }
