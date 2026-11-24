# AGENTS.md

- Done means `pnpm check` passes.
- Use pnpm for every install and script.
- Keep `@ui-sdk/*` on exact versions while the SDK is in beta. After a bump, re-run `pnpm dlx skills@latest add vercel-labs/ui --skill ui-sdk -a claude-code -y` so `.claude/skills/ui-sdk` matches the installed package.
- Tests import `agent` from `src/agent.ts` (one bridge per test file) instead of calling `createAgent()`.
