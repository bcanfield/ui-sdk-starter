# ui-sdk-starter

A template for starting an app on the [UI SDK](https://github.com/vercel-labs/ui)
(`@ui-sdk/react`), set up the way its authors recommend: React 19, Vite,
TypeScript, the SDK's default stylesheet, its agent skill and its agent test.

## Start

Needs Node 24 (`.nvmrc`) and pnpm 11 (pinned in `package.json`).

```sh
pnpm install && pnpm dev
```

Then rename `name` in `package.json` and `<title>` in `index.html`, and strip
the showcase: delete the `src/showcase/` folder and the `<Showcase />` line in
`src/App.tsx`. Keep `src/agent.ts` and its import in
`src/main.tsx`, `<OverlayHost />` in `src/App.tsx` (the bridge's `confirm()`
needs it), `src/test/setup.ts`, and one agent test per interface. To restyle, edit the tokens in
`src/styles/tokens.css`.

## Commands

| Command          | Does                                         |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Vite dev server                              |
| `pnpm build`     | Production build to `dist/`                  |
| `pnpm preview`   | Serve the built `dist/`                      |
| `pnpm typecheck` | `tsc --noEmit`                               |
| `pnpm lint`      | oxlint, type-aware                           |
| `pnpm test`      | Vitest + Testing Library                     |
| `pnpm check`     | typecheck, lint, test, build                 |

## What is included

Three showcase sections, one per SDK idea:

1. **First component**: the authors' Toggle, with pressed state, keyboard
   handling and `aria-pressed` built in.
2. **Settings form**: Field, Input, Select, Switch and AlertDialog, with the
   destructive button marked `data-agent-confirm`.
3. **Agent bridge**: `createAgent` lets an agent read and drive the page's
   components by name, and asks you before a marked step. It is also offered to
   WebMCP browsers, and is `window.agent` under `pnpm dev` only. "Run risky
   agent step" presses the settings form's delete button, so remove the two
   together.

Tooling: oxlint, Vitest with the SDK's jsdom setup, and the authors' skill in
`.claude/skills/ui-sdk/` (pinned in `skills-lock.json`), the `interface-taste`
and `interface-engineering` skills in `.claude/skills/` (adapted from
design-taste, not in `skills-lock.json`), design tokens in
`src/styles/tokens.css`, a System/Light/Dark theme control, and a style-guard
test. `AGENTS.md` holds the rules for coding agents.

## Docs

- UI SDK docs: https://ui-sdk.dev/docs
- Source: https://github.com/vercel-labs/ui
- Docs for the installed version: `node_modules/@ui-sdk/react/docs/llms.txt`

The SDK is in beta, so APIs may change.
