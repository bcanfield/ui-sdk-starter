# AGENTS.md

- Done means `pnpm check` passes.
- Use pnpm for every install and script.
- Keep `@ui-sdk/*` on exact versions while the SDK is in beta. After a bump, re-run `pnpm dlx skills@latest add vercel-labs/ui --skill ui-sdk -a claude-code -y` so `.claude/skills/ui-sdk` matches the installed package.
- Tests import `agent` from `src/agent.ts` (one bridge per test file) instead of calling `createAgent()`.
- Before UI work, also load the `interface-taste` and `interface-engineering` skills (`.claude/skills/`). They are adapted to ui-sdk; where anything still disagrees, the ui-sdk skill wins.
- Colors, fonts, radii, easing and durations are tokens in `src/styles/tokens.css`, and nothing else writes a color. `src/test/style-guard.test.ts` checks token contrast in both schemes: fix a failing pair by changing the token, not the test.
- After a UI change, look at it in a real browser in light and dark at 390px wide; jsdom can't check color or motion.
