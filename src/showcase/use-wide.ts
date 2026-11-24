import { useSyncExternalStore } from "react"

// Keep in step with the 56rem breakpoint in showcase.css.
const WIDE = "(min-width: 56rem)"

const wideQuery = () => window.matchMedia?.(WIDE)

function useWide() {
  return useSyncExternalStore(
    (onChange) => {
      const query = wideQuery()
      query?.addEventListener("change", onChange)
      return () => query?.removeEventListener("change", onChange)
    },
    () => wideQuery()?.matches ?? true
  )
}

export { useWide }
