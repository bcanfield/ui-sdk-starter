# UI SDK (vercel-labs/ui): research note

Source of truth: https://github.com/vercel-labs/ui at commit `074ac1c4e7ac6607b7291a4ff71eb4ee3154fa98` (HEAD of default branch when read, 2026-11-24). Read from a GitHub API tarball extracted read-only; the user-made depth-1 clone at the same SHA (`git rev-parse HEAD` confirmed) shows no file differences. Nothing from the repo was installed, built or run. Paths below are repo-relative; `docs:` means `apps/docs/content/docs/`. The docs site https://ui-sdk.dev/docs returns 200 and its sources are the `docs:` files, so I cited the files. Anything not confirmed is marked UNCONFIRMED.

## Recommended build

Build a **React 19 + Vite + TypeScript** app (Vite is the only bundler the React docs name besides Next.js, and it is the lighter of the two). Install `@ui-sdk/react` and `@ui-sdk/core` (both `0.1.0-beta.16`) with the project's package manager, and import `@ui-sdk/core/web.css` once in `main.tsx`. Showcase: (1) the authors' own "First Component" Toggle, (2) a Field + Input + Select + Switch settings form with an AlertDialog, copied from the skill's example, and (3) a `createAgent` bridge plus the authors' agent test, since "behaviors for agents" is the pitch. Install the authors' skill (`npx skills@latest add vercel-labs/ui --skill ui-sdk`) and add the AGENTS.md note from their setup prompt. No keys, accounts or env vars are needed. There is no scaffolder or starter template (Q2), so the Vite app comes from the stock Vite React-TS starter, which is outside this repo (UNCONFIRMED which Vite/Node versions pair; see Q2).

## 1. What it is

- Tagline: "A library of behaviors for agents to build and drive the next generation of user interfaces." (`README.md:3`). Keyboard navigation, focus, selection, dismissal, popups, drag and drop and ARIA live in `@ui-sdk/core`, with adapters for React, Vue, Svelte, Solid and Web Components (`README.md:5`).
- Not a component library: "It's the layer underneath one" (`AGENTS.md:3`). Layers: behaviors, primitives (`definePrimitive`), adapters (`createParts`), checking (`@ui-sdk/core/testing`), agents (`@ui-sdk/core/agent`: `snapshot`, `act`) (`AGENTS.md:5-11`). It also ships ~55 ready-made unstyled components (list in `packages/core/skills/ui-sdk/references/build-interface.md:7-57`; examples dirs under `examples/components/`).
- Principles: no runtime dependencies, SSR and pre-hydration support, RTL without a provider, popups without portals (`AGENTS.md:19-21`).
- Published packages, all version `0.1.0-beta.16` per `packages/<name>/package.json:2-3`, and npm `latest` and `beta` dist-tags both resolve to `0.1.0-beta.16` (`npm view`, run 2026-11-24): `@ui-sdk/core`, `@ui-sdk/react`, `@ui-sdk/vue`, `@ui-sdk/svelte`, `@ui-sdk/solid`, `@ui-sdk/web`. License Apache-2.0 (`packages/core/package.json`).
- Maturity: beta. "UI SDK is in beta" (`README.md:16`); "the framework, APIs, documentation, and behavior may change before general availability" under Vercel beta terms (`README.md:195-198`). Changesets are in prerelease mode, tag `beta` (`.changeset/pre.json:1-4`).

## 2. Recommended start

- **Scaffolder: none found.** No `create-*` package or CLI in `packages/` (only core, react, vue, svelte, solid, web), and no starter template directory. A search of md/mdx/json for `create-`/`npm create` found nothing relevant. UNCONFIRMED only in the sense that I did not read every one of the 8161 files; the docs and skill never mention a scaffolder.
- Authors' install path: `npm install @ui-sdk/react @ui-sdk/core` (`README.md:18-19`, `docs:react/installation.mdx:10-12`), then `npx skills@latest add vercel-labs/ui --skill ui-sdk` (`README.md:26-28`). Or paste the docs' setup prompt into an agent (`apps/docs/content/shared/setup-prompt/react.mdx:1-7`): install both packages with the project's package manager, add an AGENTS.md note pointing at `node_modules/@ui-sdk/react/docs/llms.txt`, install the skill. "If a release-age policy blocks the install, stop and ask me instead of changing it" (same file, line 4).
- Frameworks: React (>=19 `react`/`react-dom`, `@types/react >=19.2.10` optional; `packages/react/package.json:388-393`), Vue (Nuxt module `@ui-sdk/vue` in `modules`; `docs:vue/installation.mdx:38-48`), Svelte (Svelte 5; SvelteKit supported; `docs:svelte/installation.mdx:46`), Solid (Solid 2 only: `solid-js` and `@solidjs/web` >=2.0.0; `references/build-interface.md:106`), Web Components. Next.js is explicitly supported for React (`docs:react/installation.mdx:44,59`; `docs:react/server-rendering.mdx:8-22`). Vite is the other named React setup (`installation.mdx:44`).
- Starter pointer for newcomers: React "First Component" (Toggle) at `docs:react/first-component.mdx:1-78`.
- Node / package manager: the repo itself uses Node 24 (`.nvmrc`) and `pnpm@10.34.5` (`package.json:5`), but that is for contributing. The published packages declare **no `engines`** (grep of `packages/*/package.json` found none), and docs use `npm install`. Required Node for a consumer app: UNCONFIRMED (follow Vite's own requirement). The user's global rule: personal repos use pnpm.
- A page with no build step: load `https://ui-sdk.dev/web.js` and `https://ui-sdk.dev/web.css` (both from `packages/core/skills/ui-sdk/references/web-components.md:11-20`); `https://ui-sdk.dev/web.md` returned 200 text/markdown. Not recommended as the main path but it is the zero-install option.

## 3. Structure and conventions

The repo prescribes no app layout for consumers. What it does prescribe (skill rules, `packages/core/skills/ui-sdk/SKILL.md:37-49`):
- Import each component from its own entry, e.g. `@ui-sdk/react/select`; there is no root import from `@ui-sdk/react` (`docs:react/installation.mdx:38`); never import `@ui-sdk/core/internal/*`.
- Roots plus parts, nested as each component page's Composition shows. Change an element with `render`, never an `as` prop.
- Default vs controlled: `defaultValue`, or `value` + `onValueChange(value, details)` (`details.reason`, `details.source`, `details.cancel()`) (`references/build-interface.md:69-81`).
- Name every control (`FieldLabel`, `DialogTitle`, or `aria-label`). Key lists by value or id. Do not hand-roll `role=` widgets that ship.
- Styling: components render no styles. Optional `@ui-sdk/core/web.css`, imported once (`main.tsx` in Vite, `app/layout.tsx` in Next; `docs:react/installation.mdx:44-48`). With Tailwind, in the global CSS:
  ```css
  @layer ui-sdk;

  @import "tailwindcss";
  @import "@ui-sdk/core/web.css" layer(components);
  ```
  (`docs:react/installation.mdx:52-57`). Theme via `--ui-*` tokens on `:root` (`references/styles.md:12-28`); style state with `data-*` attributes (`data-pressed`, `data-open`, `data-slot` names), e.g. Tailwind `data-pressed:bg-neutral-900` (`docs:react/first-component.mdx:53`).
- Server/client: ui-sdk modules already say `"use client"`; your own file needs `"use client"` if it uses state, effects, handlers, or calls `createParts` (`references/build-interface.md:100`; `docs:react/server-rendering.mdx:8-22,50-52`). Create the agent bridge only in client code (`references/agent-ready.md:68`).
- Routing and data fetching: not prescribed (UNCONFIRMED that any guidance exists; none found in the files read).
- Config files: none required by ui-sdk. Vue/Nuxt: add `"@ui-sdk/vue"` to `modules` (`SKILL.md:23`). Solid + Vite: `optimizeDeps: { exclude: ["@ui-sdk/core"] }` (`references/build-interface.md:106`).
- Authors' docs-example convention (their own examples, not a consumer rule): no comments, no class names, layout via `data-slot` (`contributing/examples.md:9-10`).

## 4. Core APIs for a hello world (verbatim from the repo)

**Toggle, the authors' first component** (`docs:react/first-component.mdx:14-22,30-38`):
```tsx
import { Toggle } from "@ui-sdk/react/toggle"

function BookmarkButton() {
  return <Toggle>Bookmark</Toggle>
}

export { BookmarkButton }
```
`Toggle` renders a button, keeps pressed state, handles Enter and Space, and sets `aria-pressed` (`first-component.mdx:24`). Style hook: `data-pressed` (line 44).

**Controlled state** (`docs:react/server-rendering.mdx:54-70`):
```tsx
"use client"

import { Toggle } from "@ui-sdk/react/toggle"
import { useState } from "react"

function MuteButton() {
  const [muted, setMuted] = useState(false)

  return (
    <>
      <Toggle pressed={muted} onPressedChange={setMuted}>
        Mute
      </Toggle>
      <output>{muted ? "Sound is off" : "Sound is on"}</output>
    </>
  )
}
```

**Dialog** (`examples/components/dialog/react/basic.tsx:1-41`; uses `lucide-react` only for the close icon, which a hello world can drop):
```tsx
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@ui-sdk/react/dialog"
// ...
<Dialog>
  <DialogTrigger>Share</DialogTrigger>
  <DialogBackdrop />
  <DialogContent>
    <DialogTitle>Share link</DialogTitle>
    <DialogDescription>Anyone who has this link will be able to view this.</DialogDescription>
    <DialogClose data-variant="solid">Done</DialogClose>
  </DialogContent>
</Dialog>
```
(Condensed from the file: the `Field`/`Input` and layout `div`s were removed; check part names against the file.)

**Settings form (Field, Input, Select, Switch, AlertDialog)**: full example at `packages/core/skills/ui-sdk/references/build-interface.md:114-181`. Key lines:
```tsx
import { Field, FieldLabel } from "@ui-sdk/react/field"
import { Input } from "@ui-sdk/react/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui-sdk/react/select"
import { Switch, SwitchThumb } from "@ui-sdk/react/switch"
```
Authors' form rules: give controls a `name`; text goes in `Input` inside `Field`, not `FieldControl` (`build-interface.md:83-87`).

**Agent bridge** (the distinctive feature; `references/agent-ready.md:53-62`, `docs:agents/index.mdx:47-51`):
```ts
import { agentTools, createAgent, registerTools } from "@ui-sdk/react/agent"

const agent = createAgent({
  allow: (step, { signal }) =>
    step.confirm ? askThePerson(step.confirm, { signal }) : true,
})

export { agent }
```
`agent.snapshot()` lists components, `agent.act({ steps })` runs steps (`agent-ready.md:64`). Mark risky controls with `data-agent-confirm="<what it does>"` (`agent-ready.md:23`). `askThePerson` is the doc's placeholder and must be written by the app. `registerTools` (WebMCP) does nothing without `document.modelContext` (`agent-ready.md:66`).

**Custom primitive (core's own API)**, `README.md:36-64` (`definePrimitive`, `createFocusRecovery`, `createParts` from `@ui-sdk/react/primitive`). Optional for hello world; the smaller `muteButton` example is at `docs:agents/index.mdx:14-35`.

## 5. Human prerequisites

None found. No API keys, accounts, env vars or paid services appear in the install docs, setup prompt, or skill. A hello world runs with none. `createAgent` runs in the browser and needs no model; only a self-supplied model/WebMCP browser agent would need anything, and that is optional (`agent-ready.md:65-66`). Caveat: the docs say "If a release-age policy blocks the install, stop and ask me" (`setup-prompt/react.mdx:4`), so a human may need to decide if a package-manager release-age policy blocks a recent beta (the repo uses `minimumReleaseAge: 1440` itself, `pnpm-workspace.yaml`).

## 6. Testing, linting, type-checking, deploying

Authors' consumer guidance (`packages/core/skills/ui-sdk/SKILL.md:51-56`, `references/testing.md`):
- Type-check: `npx tsc --noEmit -p <app config>` (or `tsc -b` when root `tsconfig.json` has `"files": []`); `svelte-check` for Svelte, `vue-tsc` for Vue.
- Tests: Vitest + jsdom + Testing Library (`testing.md:13-15`): `npm i -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event`; `vitest.config.ts` merges the Vite config with `test.environment: "jsdom"`, `setupFiles`, `css: false` (`testing.md:19-32`); `src/test/setup.ts` sets `globalThis.__UI_SDK_STRICT__ = true`, `afterEach(cleanup)`, and the jsdom stubs (`testing.md:37-49,120-141`, required before anything opens: popover, `getAnimations`, `ResizeObserver` etc.).
- Every interface gets at least the agent test: `createAgent()`, render, `agent.snapshot()` labels, `agent.act({steps})` (`agent-ready.md:74-109`).
- `@ui-sdk/core/testing` provides `checkPattern`, `mount`, `checkServer`, `checkDirection` for custom primitives; do not run `checkPattern` on shipped components (`testing.md:55`).
- Real browser for popups, layout, focus, contrast (`testing.md:166-170`).
- Linting / deploying for a consumer app: no recommendation found (UNCONFIRMED). The repo's own tooling (eslint, prettier, Playwright, Vercel for the docs site: `apps/docs/vercel.json`) is for contributing, not consumers (`package.json:8-25`).

## 7. Gotchas and agent assets

- Beta; APIs may change (`README.md:195-198`). No root import (`docs:react/installation.mdx:38`).
- With Tailwind, importing `web.css` from a script gets reset by Tailwind's base styles; use the `@import ... layer(components)` form (`references/styles.md:7`). `web.css` draws icons in `::before`/`::after` on triggers, so adding your own glyph gives two (`styles.md:32`). It sets heights/sizes (`styles.md:40-50`).
- Need `@layer ui-sdk;` at the top of the global stylesheet (`SKILL.md:44`).
- Plain `<button>`/`<input>` are invisible to the agent bridge; use `Button`, `Input` inside `Field` (`agent-ready.md:15-17`).
- jsdom needs stubs (Q6). Create one agent bridge per test file; it has no `destroy` (`agent-ready.md:112`).
- In Next.js create the bridge in client code only (`agent-ready.md:68`).
- `@ui-sdk/solid` needs Solid 2; Svelte rules (no module-level `$state`) in `build-interface.md:104-106`.
- **AI-agent assets to copy/install into the consuming project:**
  - The skill: `npx skills@latest add vercel-labs/ui --skill ui-sdk` (`README.md:26-28`; `skills.sh.json:1-3` points at `packages/core/skills`). Same files ship in the package at `node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md` (`docs:agents/skills.mdx`), with references `build-interface.md`, `create-component.md`, `agent-ready.md`, `testing.md`, `styles.md`, `patterns.md`, `web-components.md`.
  - Per-version docs as Markdown inside each package: `node_modules/@ui-sdk/react/docs/llms.txt` (index), `docs/components/<name>.md`, `docs/core.md` (over 300 KB, search by heading), `docs/rendering.md` (`SKILL.md:12-17`). Not verified by me (I did not install); `packages/react/README.md` states the docs ship in the package. Online: https://ui-sdk.dev/docs.
  - AGENTS.md note to add to the app (from `setup-prompt/react.mdx:5`): before using ui-sdk, follow the ui-sdk skill if installed and read `node_modules/@ui-sdk/react/docs/llms.txt`.
  - The repo's `.agents/skills/ui-sdk-*` and `.agents/experts` are for working on ui-sdk itself; marked internal (`AGENTS.md:43-44,46`). Not for consumers. (I listed but did not read `.agents/`.)
  - Repo-root `CLAUDE.md` is just `@AGENTS.md`; AGENTS.md is contributor guidance (conventional commits, no comments, "Finish with unslop"). Do not copy it wholesale.
- No standalone `llms.txt` at the repo root; the one that exists ships in packages (UNCONFIRMED whether `https://ui-sdk.dev/llms.txt` exists; not fetched).

## 8. Closest existing example to a hello world

There is no dedicated hello-world app. Closest, by smallest first:
1. `examples/components/toggle/react/first-component.tsx` (the file the "First Component" tutorial renders; 7 lines: `<Toggle data-variant="outline">Bookmark</Toggle>`, exports `Example`). Siblings in `examples/components/toggle/react/`: `basic.tsx`, `first-component.tsx`, `group-rtl.tsx`, `group-single.tsx`, `group.tsx`, `render.tsx`, `rtl.tsx`. Shared style: `examples/components/toggle/toggle.css`.
2. For a runnable harness: `apps/playground/` (Vite, fixtures per component per framework, `apps/playground/README.md:1-20`; runs inside the monorepo with pnpm, not standalone). Files: `index.html`, `package.json`, `vite.config.ts`, `src/{index.css,index.ts,main.ts,...}`, `src/fixtures/`, `src/ssr/`.
3. The tutorial-style, copy-ready code is in docs (`docs:react/first-component.mdx`), not in `examples/`; `examples/` files are monorepo-internal (they import `examples/shared/react/log` and scoped CSS, per `contributing/examples.md:24`), so copy only the component imports.
Treat `examples/` as reference, not a template: the "examples" workspace (`examples/package.json`) is private and built with `pnpm --filter examples build`.

## Open decisions / UNCONFIRMED

- Vite vs Next.js for the hello-world host; I recommend Vite. Node version for consumers is UNCONFIRMED (no `engines`).
- No scaffolder, starter template, consumer lint or deploy guidance was found.
- Package-shipped `docs/llms.txt` and the skill-in-package existence are asserted by repo docs but not verified by installing.
- `.agents/` contents, `contributing/` pitfalls, and most of `apps/docs/content` were not read in full.
- Side note: I ran `npm view` with the extracted repo as cwd (reads `.npmrc` only; it warned about `node-linker`); nothing else was executed from it.

## Corrections and verification (2026-11-24, after building the app)

- Verified by installing `0.1.0-beta.16`: `node_modules/@ui-sdk/react/docs/llms.txt` exists (plus `docs/components/*.md`, `docs/agents.md`, `docs/core.md`); the skill ships at `node_modules/@ui-sdk/core/skills/ui-sdk/` and is byte-identical to the one `skills add` installs. `@ui-sdk/core/web.css`, `/agent` and `/testing` are real package exports. The earlier "not verified" notes in section 7 are now resolved.
- Peer dependencies of `@ui-sdk/react`: `react`/`react-dom` >=19, `@types/react` >=19.2.10, `@ui-sdk/core` ^0.1.0-beta.16. No conflicts with React 19.3.
- Consumer Node: still no `engines`; the app pins Node 24 (current LTS per `mise latest node@lts`) and builds with Vite 8.
- `pnpm dlx skills@latest add vercel-labs/ui --skill ui-sdk -a claude-code -y` runs non-interactively and writes `.claude/skills/ui-sdk/` and `skills-lock.json` in the project (not `.agents/`).
- Tooling gotcha: typescript-eslint 8.73 refuses TypeScript 7; the app uses TypeScript ~6.0.
- Behaviour note: `createAgent({ allow })` refusing a `data-agent-confirm` step returns `error.message` like `The person said no to "<confirm text>"` (not "Needs a person", which appears only when no `allow` is set).

## Corrections (2026-11-24, after the dependency and structure audits)

- Supersedes the Node and TypeScript lines above: `mise.toml` is gone. Node 24 is declared in `.nvmrc` and `engines` (`^22.22.2 || ^24.15.0 || >=26.0.0`), and pnpm is pinned by `packageManager` (`pnpm@11.22.0`).
- ESLint and typescript-eslint are removed. Lint is oxlint 1.95 with type-aware rules (`oxlint-tsgolint`), configured in `.oxlintrc.json`. TypeScript is `~7.0.2`; the earlier "TypeScript ~6.0" hold no longer applies. There is no formatter.
- Section 6 said no consumer lint guidance exists; that still holds. oxlint is the owner's choice (it matches create-vite's current starter), not an SDK recommendation.
- The global stylesheet is `src/index.css` (was `src/app.css`). `src/agent.ts` is imported from `src/main.tsx`, per the Agents guide. The agent note is `AGENTS.md`; `CLAUDE.md` only imports it.
- The audits are kept beside this note: `docs/research/audit-dependencies.md` and `docs/research/audit-structure.md`. Checked against the running code: the page-level agent labels are unique and include "Bookmark", and focus returns to the trigger after both Cancel and Delete forever and to "Run risky agent step" after Refuse.
