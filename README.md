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
the showcase: delete the `src/showcase/` folder, the `Showcase` import and the `<Showcase />` line in `src/App.tsx`, then run `pnpm check`. Keep `src/agent.ts` and its import in
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

The page is a showcase in `src/showcase/`: a hero, then three sections.

1. **Agent run**: a project pane, and a plan that plays `act` calls against it.
   The agent is scripted. Nothing calls a model and no network is needed. The
   last step touches a field marked `data-agent-confirm`, so the real confirm
   dialog asks you first.
2. **Built from core**: a project mark picker the SDK doesn't ship, built from
   `@ui-sdk/core`, next to the shipped Tabs, with a right-to-left switch.
3. **In the repo**: an excerpt of the pane's agent test, the SDK's testing
   helpers and where this repo uses them, and how to strip the showcase.

The shell stays when the showcase goes: the skip link, the System/Light/Dark
control, `createAgent` in `src/agent.ts` (offered to WebMCP browsers, and
`window.agent` under `pnpm dev` only) and `<OverlayHost />`, which the bridge's
`confirm()` needs.

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
