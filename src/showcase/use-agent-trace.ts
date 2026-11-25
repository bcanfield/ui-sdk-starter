import { useCallback, useRef, type RefObject } from "react"
import { reducedMotion } from "./motion.ts"

// A target is a `data-trace` key in the pane. One on a panel that isn't selected resolves to that panel's tab.
function resolve(wrap: HTMLElement, target: string) {
  const element = wrap.querySelector<HTMLElement>(`[data-trace="${target}"]`)
  const panel = element?.closest<HTMLElement>('[data-slot="tabs-panel"]')
  if (!element || !panel || panel.hasAttribute("data-selected")) return element
  return wrap.querySelector<HTMLElement>(`[data-trace="tab:${panel.dataset.tracePanel}"]`) ?? element
}

// The box moves only when the player places it: mid-step the bridge flips tabs while it searches, and
// following those switches bounced the box or left it on the other tab's control in the same spot.
function useAgentTrace(wrap: RefObject<HTMLElement | null>) {
  const box = useRef<HTMLElement | null>(null)
  const last = useRef<string | null>(null)

  const draw = useCallback((scroll: ScrollLogicalPosition | false = "nearest") => {
    const trace = box.current
    const root = wrap.current
    if (!trace || !root || !last.current) return
    const target = resolve(root, last.current)
    if (!target) return
    const from = root.getBoundingClientRect()
    const to = target.getBoundingClientRect()
    trace.style.setProperty("--trace-x", `${to.left - from.left}px`)
    trace.style.setProperty("--trace-y", `${to.top - from.top}px`)
    trace.style.setProperty("--trace-w", `${to.width}px`)
    trace.style.setProperty("--trace-h", `${to.height}px`)
    trace.dataset.target = target.dataset.trace
    // The bridge doesn't scroll a control that is already partly on screen, so it can sit under the sticky
    // strip. Bring it clear only while the visitor is watching the pane; never pull them off the plan.
    if (scroll && to.bottom > 0 && to.top < window.innerHeight) {
      target.scrollIntoView({ block: scroll, behavior: reducedMotion() ? "instant" : "smooth" })
    }
  }, [wrap])

  const place = useCallback(
    (target: string, { asking = false } = {}) => {
      last.current = target
      // The confirm dialog sits mid-screen when wide and at the bottom when narrow, so the control it asks
      // about goes to the top, below the sticky strip (the scroll margin in showcase.css), clear of both.
      draw(asking ? "start" : "nearest")
    },
    [draw]
  )

  const ref = useCallback(
    (element: HTMLElement | null) => {
      box.current = element
      if (!element) return
      draw()
      const redraw = () => draw(false)
      window.addEventListener("resize", redraw)
      return () => {
        window.removeEventListener("resize", redraw)
        box.current = null
      }
    },
    [draw]
  )

  return { place, ref }
}

export { useAgentTrace }
