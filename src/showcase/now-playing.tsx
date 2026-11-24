import { Button } from "@ui-sdk/react/button"
import { plan, TASK } from "./plan.ts"
import type { StepState, usePlanPlayer } from "./use-plan-player.ts"

const STATUS: Record<StepState, string> = {
  idle: "ready",
  running: "running",
  waiting: "needs you",
  done: "done",
  refused: "refused",
}

type Player = ReturnType<typeof usePlanPlayer>

function PlayButtons({ player }: { player: Player }) {
  const blocked = player.running || player.finished
  return (
    <>
      <Button onClick={player.run} disabled={blocked}>
        Run
      </Button>
      <Button onClick={player.step} disabled={blocked}>
        Step
      </Button>
    </>
  )
}

function NowPlaying({ player }: { player: Player }) {
  const step = plan[player.active]
  const state = step ? player.rows[player.active]!.state : "idle"
  return (
    <fieldset className="now-playing" aria-label="Now playing" data-agent-hidden>
      <span className="now-playing-count">
        {step ? `${player.active + 1}/${plan.length}` : `${plan.length} steps`}
      </span>
      <span className="now-playing-status" data-state={state}>
        {STATUS[state]}
      </span>
      <span className="now-playing-say" data-state={state}>
        {step ? step.say : TASK}
      </span>
      <div className="now-playing-buttons">
        <PlayButtons player={player} />
      </div>
    </fieldset>
  )
}

export { NowPlaying, PlayButtons }
