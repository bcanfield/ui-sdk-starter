import { describe, expect, test } from "vitest"
import { auditTokens, missesReducedMotion, namedColorsInCode, namedColorsInCss, parseTokens } from "./style-rules"

// Still unchecked: gradients, tints and text over them. The browser QA pass (light and dark at 390px) covers those.

const css = import.meta.glob<string>("/src/**/*.css", {
  query: "?raw",
  import: "default",
  eager: true,
})
const code = import.meta.glob<string>(
  ["/src/**/*.{ts,tsx}", "!/src/**/*.test.{ts,tsx}", "!/src/test/**"],
  { query: "?raw", import: "default", eager: true }
)
const html = import.meta.glob<string>("/index.html", { query: "?raw", import: "default", eager: true })
const TOKENS = "/src/styles/tokens.css"
const colorFn = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/i
const hex = /#[0-9a-f]{3,8}\b/i
// Anchors and ids look like hex (href="#cafe", url(#add), id="#add"): drop them before looking for colours.
const anchors = /\b(?:href|id|for|to|aria-[\w-]+)\s*=\s*\{?\s*["'`]#[^"'`]*["'`]|url\(\s*["']?#[^)]*\)/gi

function writesColor(path: string, text: string) {
  if (colorFn.test(text)) return true
  const stripped = text.replace(anchors, "")
  // In CSS a hex colour only follows a property colon, so selectors like `#add {` are not colours.
  if (path.endsWith(".css")) return /:[^;{}]*#[0-9a-f]{3,8}\b/i.test(stripped)
  return hex.test(stripped)
}

test("color literals live only in tokens.css", () => {
  for (const [path, text] of Object.entries({ ...css, ...code, ...html })) {
    if (path === TOKENS) continue
    expect(writesColor(path, text), `${path} writes a color; add a token to ${TOKENS}`).toBe(false)
  }
})

test("the color check ignores anchors and finds real colors", () => {
  expect(writesColor("a.tsx", '<a href="#cafe">x</a> <i id="#add" />')).toBe(false)
  expect(writesColor("a.css", "#add { margin: 0 }")).toBe(false)
  expect(writesColor("a.tsx", 'const s = { color: "#fff" }')).toBe(true)
  expect(writesColor("a.css", "a { color: #fafafa }")).toBe(true)
  expect(writesColor("index.html", '<meta name="theme-color" content="#000000" />')).toBe(true)
})

test("stylesheets name the properties they transition and honour reduced motion", () => {
  for (const [path, text] of Object.entries(css)) {
    expect(text, `${path}: transition named properties`).not.toMatch(/transition(?:-property)?\s*:\s*all\b/)
    expect(text, `${path}: no !important`).not.toMatch(/!important/)
    expect(missesReducedMotion(text), `${path} animates without a prefers-reduced-motion block`).toBe(false)
  }
})

test("index.css declares the ui-sdk layer first", () => {
  expect(css["/src/index.css"]?.trimStart().startsWith("@layer ui-sdk;")).toBe(true)
})

const themes = ["light", "dark"] as const
const tokens = parseTokens(css[TOKENS] ?? "")

function luminance(hex: string) {
  // 8-digit hex carries alpha after the six colour digits; contrast is checked on the colour only.
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const surfaces = ["surface", "surface-raised", "surface-card", "surface-hover"]
const pairs: Array<[string, string, number]> = [
  ...["fg-primary", "fg-secondary", "fg-muted", "accent", "danger"].flatMap((fg) =>
    surfaces.map((bg): [string, string, number] => [fg, bg, 4.5])
  ),
  ...["ok", "warning", "info"].flatMap((fg) =>
    ["surface", "surface-card"].map((bg): [string, string, number] => [fg, bg, 4.5])
  ),
  ["surface", "accent", 4.5],
  ...["edge-control", "accent"].flatMap((fg) =>
    ["surface", "surface-card"].map((bg): [string, string, number] => [fg, bg, 3])
  ),
]

test("every colour token is paired, exempt or an alias of one", () => {
  const paired = new Set(pairs.flatMap(([fg, bg]) => [fg, bg]))
  expect(auditTokens(css[TOKENS] ?? "", paired)).toEqual([])
})

test("named colours stay out of stylesheets and code", () => {
  for (const [path, text] of Object.entries({ ...css, ...code, ...html })) {
    if (path === TOKENS) continue
    const found = path.endsWith(".css")
      ? namedColorsInCss(text)
      : [...namedColorsInCode(text), ...namedColorsInCss(text)]
    expect(found, `${path} uses a named colour; add a token to ${TOKENS}`).toEqual([])
  }
})

describe("rule fixtures", () => {
  const paired = new Set(["a", "b"])
  const ok = "--a: light-dark(#ffffff, #000000);\n--b: light-dark(#000000, #ffffff);"
  const withToken = (line: string) => auditTokens(`${ok}\n${line}`, paired)

  test("reduced motion covers longhands and keyframes", () => {
    expect(missesReducedMotion("a { transition-duration: 1s }")).toBe(true)
    expect(missesReducedMotion("a { transition-property: opacity }")).toBe(true)
    expect(missesReducedMotion("a { animation-name: x }")).toBe(true)
    expect(missesReducedMotion("@keyframes x { to { opacity: 1 } }")).toBe(true)
    expect(
      missesReducedMotion(
        "a { transition-duration: 1s } @media (prefers-reduced-motion: reduce) { a { transition: none } }"
      )
    ).toBe(false)
    expect(missesReducedMotion("a { color: var(--duration-fast) }")).toBe(false)
  })

  test("a colour token must be paired or exempt", () => {
    expect(auditTokens(ok, paired)).toEqual([])
    expect(withToken("--c: light-dark(#111111, #eeeeee);")).toHaveLength(1)
    expect(withToken("--glow: light-dark(#ffffff00, #22c55e0d);")).toEqual([])
    expect(withToken("--edge: light-dark(#dddddd, #222222);")).toEqual([])
    expect(withToken("--edge-subtle: light-dark(#dddddd, #222222);")).toEqual([])
  })

  test("aliases count as their target", () => {
    expect(withToken("--ui-x: var(--a);")).toEqual([])
    expect(withToken("--ui-x: var(--a);\n--ui-y: var(--ui-x);")).toEqual([])
    expect(withToken("--c: light-dark(#111111, #eeeeee);\n--ui-x: var(--c);").length).toBeGreaterThan(0)
  })

  test("color-mix is exempt only when built from listed tokens", () => {
    expect(withToken("--m: color-mix(in srgb, var(--a) 34%, var(--b));")).toEqual([])
    expect(withToken("--m: color-mix(in srgb, var(--a) 34%, #ff0000);")).toHaveLength(1)
    expect(withToken("--m: color-mix(in srgb, var(--a) 34%, red);")).toHaveLength(1)
    expect(withToken("--m: color-mix(in srgb, var(--a) 34%, var(--nope));")).toHaveLength(1)
  })

  test("unparsed colour forms fail", () => {
    for (const v of [
      "oklch(0.7 0.1 150)",
      "oklab(0.7 0.1 0.1)",
      "lab(50% 10 10)",
      "lch(50% 10 10)",
      "rebeccapurple",
      "#fff",
      "rgb(0 0 0)",
      "light-dark(oklch(0.7 0.1 150), #000000)",
      "light-dark(red, blue)",
    ]) {
      expect(withToken(`--c: ${v};`), v).toHaveLength(1)
    }
    expect(withToken('--font: "Red Hat", system-ui, sans-serif;\n--r: 4px;')).toEqual([])
  })

  test("8-digit hex parses inside light-dark", () => {
    expect(parseTokens("--glow: light-dark(#ffffff00, #22c55e0d);").get("glow")).toEqual({
      light: "#ffffff00",
      dark: "#22c55e0d",
    })
  })

  test("named colours fail outside the token file", () => {
    expect(namedColorsInCss("a { color: red }")).toHaveLength(1)
    expect(namedColorsInCss("a { border: 1px solid tomato }")).toHaveLength(1)
    expect(namedColorsInCss("a { background: linear-gradient(white, var(--x)) }")).toHaveLength(1)
    expect(namedColorsInCss('<p style="color: navy">')).toHaveLength(1)
    expect(namedColorsInCss("a { color: transparent; border-color: currentColor; background: inherit }")).toEqual([])
    expect(namedColorsInCss("a { color: var(--red); font-family: sans-serif }")).toEqual([])
    expect(namedColorsInCode('<div style={{ color: "red" }} />')).toHaveLength(1)
    expect(namedColorsInCode("const s = { backgroundColor: 'white' }")).toHaveLength(1)
    expect(namedColorsInCode('<path fill="gold" />')).toHaveLength(1)
    expect(namedColorsInCode('<i style={{ color: "currentColor", background: "transparent" }} />')).toEqual([])
    expect(namedColorsInCode('<i style={{ color: "var(--fg-primary)" }} />')).toEqual([])
  })
})

describe.each(themes)("%s tokens", (theme) => {
  test.each(pairs)("%s on %s reaches %d:1", (fg, bg, min) => {
    const a = tokens.get(fg)?.[theme]
    const b = tokens.get(bg)?.[theme]
    expect(a && b, `--${fg} or --${bg} is not light-dark(#rrggbb, #rrggbb)`).toBeTruthy()
    expect(contrast(a!, b!)).toBeGreaterThanOrEqual(min)
  })
})
