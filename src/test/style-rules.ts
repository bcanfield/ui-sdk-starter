// Pure rules behind style-guard.test.ts, kept apart so fixtures can exercise them with inline strings.
//
// What the guard still can't check: gradients, tints (color-mix over alpha) and text drawn over them.
// Their contrast depends on what sits behind, so the browser QA pass (light and dark at 390px) covers it.

const NAMED_COLORS = (
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown " +
  "burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan " +
  "darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid " +
  "darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet " +
  "deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro " +
  "ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
  "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow " +
  "lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
  "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine " +
  "mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise " +
  "mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab " +
  "orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru " +
  "pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
  "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan " +
  "teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
).split(" ")
// Hyphens count as word characters so `sans-serif`, `--red` and `ui-monospace` never match.
const namedColor = new RegExp(`(?<![\\w-])(?:${NAMED_COLORS.join("|")})(?![\\w-])`, "i")
const colorFn = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/i
const hexLiteral = /#[0-9a-f]{3,8}\b/i

/** Quoted strings (font names, content) and url(...) hold no colours. */
function bare(value: string) {
  return value.replace(/"[^"]*"|'[^']*'|url\([^)]*\)/gi, "")
}

// --- Reduced motion -------------------------------------------------------

const motion = /(?:^|[\s;{])(?:transition|animation)(?:-[a-z-]+)?\s*:|@keyframes\b/i

/** True when the stylesheet moves things (any transition/animation property or @keyframes) but has no reduced-motion block. */
export function missesReducedMotion(text: string) {
  return motion.test(text) && !text.includes("prefers-reduced-motion")
}

// --- Token file -----------------------------------------------------------

export const EXEMPT_TOKENS: Record<string, string> = {
  glow: "decorative, never carries text",
  edge: "hairline divider, not a control edge",
  "edge-subtle": "hairline divider, not a control edge",
}

const lightDark = /^light-dark\(\s*(#[0-9a-f]{6}(?:[0-9a-f]{2})?)\s*,\s*(#[0-9a-f]{6}(?:[0-9a-f]{2})?)\s*\)$/i
const declaration = /--([\w-]+)\s*:\s*([^;]+);/g

export type Theme = "light" | "dark"
export type TokenValues = Record<Theme, string>

function writesColorValue(value: string) {
  const v = bare(value)
  return /light-dark\(|color-mix\(/i.test(v) || colorFn.test(v) || hexLiteral.test(v) || namedColor.test(v)
}

/** Colour tokens written light-dark(#hex, #hex), with 6- or 8-digit hex. */
export function parseTokens(css: string) {
  const out = new Map<string, TokenValues>()
  for (const [, name, value] of css.matchAll(declaration)) {
    const m = lightDark.exec(value!.trim())
    if (m) out.set(name!, { light: m[1]!, dark: m[2]! })
  }
  return out
}

/**
 * Problems with the colour tokens in a token file. Every colour token must be light-dark(#hex, #hex) and in a
 * contrast pair, or exempt. `--ui-*` aliases of a listed token count as that token; color-mix tokens are exempt
 * when built only from listed tokens.
 */
export function auditTokens(css: string, paired: Set<string>, exempt: Record<string, string> = EXEMPT_TOKENS) {
  const problems: string[] = []
  const decls = [...css.matchAll(declaration)].map(([, n, v]) => [n!, v!.trim()] as const)
  const parsed = parseTokens(css)
  const listed = (name: string) => parsed.has(name) || name in exempt
  const aliasOf = (v: string) => /^var\(\s*--([\w-]+)\s*\)$/.exec(v)?.[1]

  const colorNames = new Set(decls.filter(([, v]) => writesColorValue(v)).map(([n]) => n))
  // An alias of a colour token is itself a colour token (follow chains).
  for (let grew = true; grew; ) {
    grew = false
    for (const [n, v] of decls) {
      const target = aliasOf(v)
      if (target && colorNames.has(target) && !colorNames.has(n)) {
        colorNames.add(n)
        grew = true
      }
    }
  }
  const resolves = (name: string, seen = new Set<string>()): boolean => {
    if (seen.has(name)) return false
    seen.add(name)
    const value = decls.find(([n]) => n === name)?.[1] ?? ""
    const target = aliasOf(value)
    if (target) return resolves(target, seen)
    return listed(name) || /^color-mix\(/i.test(value)
  }

  for (const [name, value] of decls) {
    if (!colorNames.has(name)) continue
    if (aliasOf(value)) {
      if (!resolves(name)) problems.push(`--${name}: alias does not resolve to a listed token`)
      continue
    }
    if (/^color-mix\(/i.test(value)) {
      const refs = [...value.matchAll(/var\(\s*--([\w-]+)\s*\)/g)].map((m) => m[1]!)
      const rest = bare(value.replace(/var\(\s*--[\w-]+\s*\)/g, "")).replace(/^color-mix\(\s*in\s+[\w-]+\s*,/i, "")
      if (colorFn.test(rest) || hexLiteral.test(rest) || namedColor.test(rest))
        problems.push(`--${name}: color-mix may only use listed tokens`)
      else if (!refs.length || refs.some((r) => !listed(r)))
        problems.push(`--${name}: color-mix uses a token that is not listed`)
      continue
    }
    if (!parsed.has(name)) {
      problems.push(`--${name}: unparsed colour form; write light-dark(#rrggbb, #rrggbb)`)
      continue
    }
    if (!paired.has(name) && !(name in exempt)) problems.push(`--${name}: in no contrast pair and not exempt`)
  }
  return problems
}

// --- Named colours outside the token file ---------------------------------

const colorProps =
  /^(?:[\w-]*color|background[\w-]*|border[\w-]*|outline[\w-]*|fill|stroke|[\w-]*shadow|text-decoration|column-rule|--[\w-]+)$/i

/** Named colour keywords used as colour values in CSS (declarations or an HTML style attribute). Not for the token file. */
export function namedColorsInCss(text: string) {
  const found: string[] = []
  for (const [, prop, value] of text.matchAll(/([\w-]+)\s*:\s*([^;{}"]+)/g)) {
    if (!colorProps.test(prop!)) continue
    const m = namedColor.exec(bare(value!))
    if (m) found.push(`${prop}: ${m[0]}`)
  }
  return found
}

/** Named colour keywords in ts/tsx/html: inline style objects and colour attributes such as fill="red". */
export function namedColorsInCode(text: string) {
  const found: string[] = []
  const keyed =
    /\b(?:color|background(?:Color)?|border\w*|outline\w*|fill|stroke|\w*Shadow|\w*Color)\s*[:=]\s*\{?\s*["'`]([^"'`]*)["'`]/g
  for (const [, value] of text.matchAll(keyed)) {
    const m = namedColor.exec(bare(value!))
    if (m) found.push(m[0])
  }
  return found
}
