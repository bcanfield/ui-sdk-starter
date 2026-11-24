import { Button } from "@ui-sdk/react/button"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs"
import { useEffect, useState } from "react"
import { callOf, plan } from "./plan.ts"
import type { usePaneHistory } from "./use-pane-history.ts"
import type { usePlanPlayer } from "./use-plan-player.ts"

const TABS = ["plan", "log"] as const
type ConsoleTab = (typeof TABS)[number]

function tabFromUrl(): ConsoleTab {
  const wanted = new URLSearchParams(window.location.search).get("console")
  return TABS.find((tab) => tab === wanted) ?? "plan"
}

function useConsoleTab() {
  const [tab, setTab] = useState(tabFromUrl)
  useEffect(() => {
    const onPop = () => setTab(tabFromUrl())
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])
  function select(value: string) {
    const next = TABS.find((t) => t === value) ?? "plan"
    const url = new URL(window.location.href)
    url.searchParams.set("console", next)
    window.history.replaceState(window.history.state, "", url)
    setTab(next)
  }
  return [tab, select] as const
}

function AgentConsole({
  player,
  history,
}: {
  player: ReturnType<typeof usePlanPlayer>
  history: ReturnType<typeof usePaneHistory>
}) {
  const [tab, selectTab] = useConsoleTab()
  const { rows, running, finished, result } = player

  return (
    <div className="console" data-agent-hidden>
      <div className="console-head">
        <span className="eyebrow">agent console</span>
        <div className="player">
          <Button onClick={player.run} disabled={running || finished}>
            Run
          </Button>
          <Button onClick={player.step} disabled={running || finished}>
            Step
          </Button>
          <Button onClick={player.stop} disabled={!running}>
            Stop
          </Button>
          <Button onClick={player.reset}>Reset</Button>
        </div>
      </div>
      <p className="console-note">
        The agent can't see or press this console. It is scripted: a written plan, no
        model, through the real bridge and confirm gate. Each step is its own act call,
        so a refused step shows on its own and the run goes on.
      </p>
      {import.meta.env.DEV && (
        <p className="console-note">
          Dev build: <code>window.agent</code> is this bridge. Try{" "}
          <code>agent.snapshot()</code> in the browser console.
        </p>
      )}
      <Tabs value={tab} onValueChange={(value) => selectTab(String(value))}>
        <TabsList aria-label="Console">
          <TabsTab value="plan">Plan</TabsTab>
          <TabsTab value="log">Log</TabsTab>
        </TabsList>
        <TabsPanel value="plan">
          <p className="console-task">
            Move Apollo to Frankfurt, scale it and make it public
          </p>
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
                  <span className="step-state" data-testid="step-state">
                    {row.state}
                  </span>
                </li>
              )
            })}
          </ol>
          <output className="run-result" aria-label="Run result">
            {result}
          </output>
        </TabsPanel>
        <TabsPanel value="log">
          <p className="console-task">
            Change anything during or after the run, then undo the agent. Your changes
            stay. Undo may ask you again, and it leaves the Deploy token alone.
          </p>
          <ol className="log" aria-label="Log">
            {history.log.map((entry) => (
              <li key={entry.id} className="log-entry" data-reverted={entry.reverted || undefined}>
                <span className="source-tag" data-source={entry.source}>
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
            <output className="run-result" aria-label="Undo result">
              {history.result}
            </output>
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  )
}

export { AgentConsole }
