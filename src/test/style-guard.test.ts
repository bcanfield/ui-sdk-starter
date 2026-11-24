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
    const animates = /\b(?:transition|animation)\s*:/.test(text)
    expect(
      !animates || text.includes("prefers-reduced-motion"),
      `${path} animates without a prefers-reduced-motion block`
    ).toBe(true)
  }
})

test("index.css declares the ui-sdk layer first", () => {
  expect(css["/src/index.css"]?.trimStart().startsWith("@layer ui-sdk;")).toBe(true)
})

const themes = ["light", "dark"] as const
const tokens = new Map<string, Record<(typeof themes)[number], string>>()
for (const [, name, light, dark] of (css[TOKENS] ?? "").matchAll(
  /--([\w-]+):\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi
)) {
  tokens.set(name!, { light: light!, dark: dark! })
}

function luminance(hex: string) {
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
