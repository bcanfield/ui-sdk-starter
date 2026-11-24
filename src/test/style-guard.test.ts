import { describe, expect, test } from "vitest"

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

function hasNamedColor(value: string) {
  return (value.toLowerCase().match(/[a-z]+/g) ?? []).some((w) => named.has(w))
}

function writesColor(path: string, text: string) {
  const stripped = text.replace(comments, "").replace(anchors, "")
  if (colorFn.test(stripped)) return true
  if (!path.endsWith(".css")) return path.endsWith(".html") ? hex.test(stripped) : styleContext.test(stripped)
  for (const [, prop, value] of stripped.matchAll(declaration)) {
    if (!value || !colorProperty.test(prop!.toLowerCase())) continue
    if (hex.test(value) || hasNamedColor(value.replace(/var\([^)]*\)|url\([^)]*\)/gi, ""))) return true
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
  expect(writesColor("index.html", '<meta name="theme-color" content="#000000" />')).toBe(true)
})

function withoutNoPreference(text: string) {
  const open = /@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{/g
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

const motionTransition = /\btransition(?:-property)?\s*:[^;{}]*\b(?:transform|translate|scale|rotate)\b/
const motionAnimation = /@keyframes|\banimation(?:-name)?\s*:/

test("stylesheets name the properties they transition and honour reduced motion", () => {
  for (const [path, raw] of Object.entries(css)) {
    const text = raw.replace(comments, "")
    expect(text, `${path}: transition named properties`).not.toMatch(/transition(?:-property)?\s*:\s*all\b/)
    expect(text, `${path}: no !important`).not.toMatch(/!important/)
    const moves = motionTransition.test(text) || motionAnimation.test(text)
    expect(
      !moves || text.includes("prefers-reduced-motion"),
      `${path} moves things without a prefers-reduced-motion block`
    ).toBe(true)
    // Colour and opacity may change anywhere; scale and motion transitions only under no-preference.
    // A static `translate` (the skip link parked off screen) is positioning, not motion, so it may sit outside.
    const outside = withoutNoPreference(text)
    expect(outside, `${path}: scale outside no-preference`).not.toMatch(/(?<![\w-])scale\s*:/)
    expect(outside, `${path}: motion transition outside no-preference`).not.toMatch(
      /\b(?:transition(?:-property)?)\s*:[^;{}]*\b(?:translate|rotate|transform|scale)\b/
    )
  }
})

test("index.css declares the ui-sdk layer first", () => {
  expect(css["/src/index.css"]?.trimStart().startsWith("@layer ui-sdk;")).toBe(true)
})

const themes = ["light", "dark"] as const
const tokens = new Map<string, Record<(typeof themes)[number], string>>()
const tokenSource = css[TOKENS] ?? ""
for (const [, name, light, dark] of tokenSource.matchAll(
  /--([\w-]+):\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi
)) {
  tokens.set(name!, { light: light!, dark: dark! })
}
for (const [, name, target] of tokenSource.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\)\s*;/g)) {
  const resolved = tokens.get(target!)
  if (resolved) tokens.set(name!, resolved)
}

function luminance(hex: string) {
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

const surfaces = ["surface", "surface-card", "surface-hover"]
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

describe.each(themes)("%s tokens", (theme) => {
  test.each(pairs)("%s on %s reaches %d:1", (fg, bg, min) => {
    const a = tokens.get(fg)?.[theme]
    const b = tokens.get(bg)?.[theme]
    expect(a && b, `--${fg} or --${bg} is not light-dark(#rrggbb, #rrggbb)`).toBeTruthy()
    expect(contrast(a!, b!)).toBeGreaterThanOrEqual(min)
  })
})
