import { describe, expect, test } from "vitest"
import {
  auditTokens,
  missesReducedMotion,
  namedColorsInCode,
  namedColorsInCss,
  parseTokens,
  rawTimes,
} from "./style-rules"

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
const comments = /\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|(?<![:\w"'`(])\/\/[^\n]*/g
// Anchors and ids look like hex (href="#cafe", url(#add), id="#add"): drop them before looking for colours.
const anchors = /\b(?:href|id|for|to|aria-[\w-]+)\s*=\s*\{?\s*["'`]#[^"'`]*["'`]|url\(\s*["']?#[^)]*\)/gi
// A selector like `a:hover #add {` ends at `{`, so it never matches as a declaration.
const declaration = /(?:^|[;{}])\s*([\w-]+)\s*:\s*([^;{}]*)(?=[;}]|$)/g

const named = new Set(
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen".split(
    " "
  )
)
const colorProperty =
  /^(?:color|background(?:-[\w-]+)?|border(?:-[\w-]+)?|outline(?:-[\w-]+)?|fill|stroke|box-shadow|text-decoration-color|accent-color|caret-color)$/
// In .ts/.tsx a hex only counts as a colour in a style object key or a `style=` prop, so `#add` selectors and `#face` hashes pass.
const styleContext =
  /(?:\b(?:color|background[\w]*|border[\w]*|outline[\w]*|fill|stroke|boxShadow|textDecorationColor|accentColor|caretColor)\s*:|\bstyle\s*=)\s*\{?[^;\n]*?["'`]#[0-9a-f]{3,8}\b/i

const colorKey =
  "color|background[\\w]*|border[\\w]*|outline[\\w]*|fill|stroke|boxShadow|textDecorationColor|accentColor|caretColor"
// A named colour as the value of a style key: `color: "red"`, `style={{ borderColor: 'white' }}`.
const namedInStyle = new RegExp(`\\b(?:${colorKey})\\s*:\\s*["'\`]([^"'\`\\n]*)["'\`]`, "gi")

function hasNamedColor(value: string) {
  return (value.toLowerCase().match(/[a-z]+/g) ?? []).some((w) => named.has(w))
}

function hasNamedStyleColor(text: string) {
  return [...text.matchAll(namedInStyle)].some((m) => hasNamedColor(m[1]!.replace(/var\(\s*--[\w-]+/g, "var(")))
}

function writesColor(path: string, text: string) {
  const stripped = text.replace(comments, "").replace(anchors, "")
  if (colorFn.test(stripped)) return true
  if (!path.endsWith(".css")) return path.endsWith(".html") ? hex.test(stripped) : styleContext.test(stripped) || hasNamedStyleColor(stripped)
  for (const [, prop, value] of stripped.matchAll(declaration)) {
    if (!value) continue
    const custom = prop!.startsWith("--")
    if (!custom && !colorProperty.test(prop!.toLowerCase())) continue
    if (hex.test(value)) return true
    // Only a var() fallback (after the first comma) is a value; the variable name is not.
    const fallbacks = [...value.matchAll(/var\(\s*--[\w-]+\s*,([^)]*)\)/gi)].map((m) => m[1]!)
    const bare = value.replace(/var\([^)]*\)|url\([^)]*\)/gi, "")
    if (hasNamedColor(bare) && (custom || colorProperty.test(prop!.toLowerCase()))) return true
    if (fallbacks.some(hasNamedColor)) return true
  }
  return false
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
  expect(writesColor("a.css", "a:hover #add { margin: 0 }")).toBe(false)
  expect(writesColor("a.css", ":is(#cafe) {}")).toBe(false)
  expect(writesColor("a.css", "/* rgb( in a comment */")).toBe(false)
  expect(writesColor("a.tsx", "// rgb( in a comment\nconst a = 1")).toBe(false)
  expect(writesColor("a.html", "<!-- #fff -->")).toBe(false)
  expect(writesColor("a.tsx", 'const s = { color: "#fff" }')).toBe(true)
  expect(writesColor("a.tsx", '<i style={{ background: "#abc" }} />')).toBe(true)
  expect(writesColor("a.tsx", 'document.querySelector("#add"); location.hash === "#face"')).toBe(false)
  expect(writesColor("a.css", "a { color: red }")).toBe(true)
  expect(writesColor("a.css", "a { border: 1px solid white }")).toBe(true)
  expect(writesColor("a.css", "a { box-shadow: 0 0 2px black }")).toBe(true)
  expect(writesColor("a.css", "a { color: currentColor; fill: none; background: transparent; outline-color: inherit }")).toBe(false)
  expect(writesColor("a.css", "a { animation-name: red; font-family: var(--white) }")).toBe(false)
  expect(writesColor("a.css", "a { color: #fafafa }")).toBe(true)
  expect(writesColor("a.css", "a { --x: white }")).toBe(true)
  expect(writesColor("a.css", "a { --x: #fff }")).toBe(true)
  expect(writesColor("a.css", "a { color: var(--x, white) }")).toBe(true)
  expect(writesColor("a.css", "a { --x: var(--y, red) }")).toBe(true)
  expect(writesColor("a.css", "a { color: var(--white); --x: var(--red); --y: 1px }")).toBe(false)
  expect(writesColor("a.tsx", '<i style={{ color: "red" }} />')).toBe(true)
  expect(writesColor("a.tsx", "const s = { background: 'white' }")).toBe(true)
  expect(writesColor("a.tsx", 'const s = { color: "white" }')).toBe(true)
  expect(writesColor("a.tsx", 'const s = { color: "var(--accent)", name: "red team" }; const t = "red team"')).toBe(false)
  expect(writesColor("index.html", '<meta name="theme-color" content="#000000" />')).toBe(true)
})

function withoutNoPreference(text: string) {
  const open = /@media\b[^{};]*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)[^{};]*\{/g
  let out = ""
  let last = 0
  for (const m of text.matchAll(open)) {
    if (m.index < last) continue
    let depth = 1
    let i = m.index + m[0].length
    for (; i < text.length && depth > 0; i++) depth += text[i] === "{" ? 1 : text[i] === "}" ? -1 : 0
    out += text.slice(last, m.index)
    last = i
  }
  return out + text.slice(last)
}

test("stylesheets name the properties they transition and honour reduced motion", () => {
  for (const [path, raw] of Object.entries(css)) {
    const text = raw.replace(comments, "")
    expect(text, `${path}: transition named properties`).not.toMatch(/transition(?:-property)?\s*:\s*all\b/)
    expect(text, `${path}: no !important`).not.toMatch(/!important/)
    expect(missesReducedMotion(text), `${path} animates without a prefers-reduced-motion block`).toBe(false)
    // Colour and opacity may change anywhere; scale and motion transitions only under no-preference.
    // A static `translate` (the skip link parked off screen) is positioning, not motion, so it may sit outside.
    const outside = withoutNoPreference(text)
    expect(outside, `${path}: scale outside no-preference`).not.toMatch(/(?<![\w-])scale\s*:/)
    expect(outside, `${path}: motion transition outside no-preference`).not.toMatch(
      /\b(?:transition(?:-property)?)\s*:[^;{}]*\b(?:translate|rotate|transform|scale)\b/
    )
  }
})

test("durations and delays come from tokens", () => {
  for (const [path, text] of Object.entries(css)) {
    if (path === TOKENS) continue
    expect(rawTimes(text), `${path} writes a time; add a token to ${TOKENS}`).toEqual([])
  }
})

test("a compound no-preference media query still counts as no-preference", () => {
  const css = "@media (hover: hover) and (prefers-reduced-motion: no-preference) { a { scale: 1 } } b { color: red }"
  expect(withoutNoPreference(css)).toBe(" b { color: red }")
})

test("index.css declares the ui-sdk layer first", () => {
  expect(css["/src/index.css"]?.trimStart().startsWith("@layer ui-sdk;")).toBe(true)
})

const themes = ["light", "dark"] as const
const tokenSource = css[TOKENS] ?? ""
const tokens = parseTokens(tokenSource)
// An alias such as `--ok: var(--accent)` is checked with its target's values.
for (const [, name, target] of tokenSource.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\)\s*;/g)) {
  const resolved = tokens.get(target!)
  if (resolved) tokens.set(name!, resolved)
}

function luminance(hex: string) {
  // 8-digit hex carries alpha after the six colour digits; contrast is checked on the colour only.
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
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

  test("motion times must be tokens, except 0s", () => {
    expect(rawTimes("a { animation: pulse 1.2s ease infinite }")).toEqual(["animation: 1.2s"])
    expect(rawTimes("a { animation-delay: 40ms }")).toEqual(["animation-delay: 40ms"])
    expect(rawTimes("a { transition: filter 0s linear 0.3s }")).toEqual(["transition: 0.3s"])
    expect(rawTimes("a { transition-delay: 0s, 0s, .15s }")).toEqual(["transition-delay: .15s"])
    expect(rawTimes("a { transition-duration: 200ms; animation-duration: 2s }")).toHaveLength(2)
    expect(rawTimes("a { transition: opacity var(--duration-fast) var(--ease-out), filter 0s linear 0ms }")).toEqual([])
    expect(rawTimes("a { animation-delay: calc(var(--stagger-step) * 3) }")).toEqual([])
    expect(rawTimes("a { width: 12rem; margin: 2s }")).toEqual([])
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
