import { useEffect, useState } from "react"

const paramOf = (name: string) => new URLSearchParams(window.location.search).get(name)

function useUrlParam<T>(
  name: string,
  parse: (raw: string | null) => T,
  format: (value: T) => string | null
) {
  const [value, setValue] = useState(() => parse(paramOf(name)))

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
    if (url.href !== window.location.href) window.history.pushState(null, "", url)
    setValue(next)
  }

  return [value, write] as const
}

export { useUrlParam }
