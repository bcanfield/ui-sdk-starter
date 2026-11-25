import { useEffect, useState } from "react"

const paramOf = (name: string) => new URLSearchParams(window.location.search).get(name)

function useUrlParam<T>(
  name: string,
  parse: (raw: string | null) => T,
  format: (value: T) => string | null
) {
  const [value, setValue] = useState(() => parse(paramOf(name)))

  // An in-page link pushes an entry that keeps the param as it was then; going back to it restores that.
  useEffect(() => {
    const restore = () => setValue(parse(paramOf(name)))
    window.addEventListener("popstate", restore)
    return () => window.removeEventListener("popstate", restore)
  }, [name, parse])

  function write(next: T) {
    const url = new URL(window.location.href)
    const raw = format(next)
    if (raw === null) url.searchParams.delete(name)
    else url.searchParams.set(name, raw)
    // Tabs switch on arrow-key focus, so a push per switch would bury the page under history entries.
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url)
    setValue(next)
  }

  return [value, write] as const
}

export { useUrlParam }
