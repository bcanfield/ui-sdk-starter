# ui-sdk-starter

A starter for apps on [ui-sdk](https://github.com/vercel-labs/ui) (`@ui-sdk/react`),
set up the way its authors suggest: React 19, Vite, TypeScript, the SDK's default
stylesheet, its agent skill and an agent test.

## Start

You need Node 24 (`.nvmrc`) and pnpm 11 (pinned in `package.json`).

```sh
pnpm install && pnpm dev
```

Rename `name` in `package.json` and `<title>` in `index.html`. Then strip the
showcase: delete the `src/showcase/` folder, the `Showcase` import and the
`<Showcase />` line in `src/App.tsx`, then run `pnpm check`.

Keep `src/agent.ts` and its import in `src/main.tsx`, `<OverlayHost />` in
`src/App.tsx` (the bridge's `confirm()` renders there), `src/test/setup.ts`, and
one agent test per interface. To restyle, change the tokens in
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

## What's on the page

The page is the showcase in `src/showcase/`: a hero and three sections.

1. **Agent run.** A settings pane and a nine-step plan that plays `act` calls
   against it. The agent is scripted, so nothing calls a model or the network.
   Step 4 asks for 12 replicas and the range check refuses it. The last step
   changes a field marked `data-agent-confirm`, so the real confirm dialog asks
   you first. Afterwards you can undo the agent's changes and keep yours.
2. **Built from core.** A project mark picker the SDK doesn't ship, built from
   `@ui-sdk/core` and shown next to the shipped Tabs, with a right-to-left switch.
3. **In the repo.** An excerpt of the pane's agent test, the SDK's testing
   helpers and where this repo uses them, and how to strip the showcase.

Strip the showcase and the shell is what's left: the skip link, the
System/Light/Dark control, `createAgent` in `src/agent.ts` (offered to WebMCP
browsers, and exposed as `window.agent` under `pnpm dev` only) and
`<OverlayHost />`. A lint rule keeps shell code from importing `src/showcase/`,
so deleting the folder can't break it.

Tooling:

- oxlint, and Vitest with the SDK's jsdom setup.
- The authors' skill in `.claude/skills/ui-sdk/`, pinned in `skills-lock.json`.
- The `interface-taste` and `interface-engineering` skills in `.claude/skills/`.
  They're adapted from design-taste and aren't in `skills-lock.json`.
- Design tokens in `src/styles/tokens.css`, and a style-guard test that checks
  their contrast in both schemes and keeps colours and motion times in that file.
- `AGENTS.md`, with the rules for coding agents.

## Docs

- ui-sdk docs: https://ui-sdk.dev/docs
- Source: https://github.com/vercel-labs/ui
- Docs for the installed version: `node_modules/@ui-sdk/react/docs/llms.txt`

ui-sdk is in beta, so its APIs can still change.
