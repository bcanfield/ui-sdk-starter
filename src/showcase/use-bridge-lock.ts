import { useRef, useState } from "react"

type Holder = "plan" | "own step" | "undo"

// One bridge drives the pane, so the plan, an own step and undo take turns: each would read
// another's confirm as its own, and undo would miss a change still being applied.
function useBridgeLock() {
  const current = useRef<Holder | null>(null)
  const [holder, setHolder] = useState<Holder | null>(null)

  async function hold(who: Holder, task: () => Promise<void>) {
    if (current.current) return
    current.current = who
    setHolder(who)
    try {
      await task()
    } finally {
      if (current.current === who) {
        current.current = null
        setHolder(null)
      }
    }
  }

  return { holder, busy: holder !== null, hold }
}

type BridgeLock = ReturnType<typeof useBridgeLock>

export { useBridgeLock, type BridgeLock }
