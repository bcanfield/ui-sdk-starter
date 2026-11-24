# Structure and conventions audit

Audited 2026-11-24 against `@ui-sdk/react` / `@ui-sdk/core` `0.1.0-beta.16` as installed, the skill at `.claude/skills/ui-sdk/` (byte-identical to `node_modules/@ui-sdk/core/skills/ui-sdk/`, checked with `diff -r`), and the upstream clone at commit `074ac1c`. `pnpm test` passed when I ran it (6 files, 14 tests). I changed no file except this one.

Out of scope here: dependency choices and versions, lint tooling, Node pinning, the contents of the tsconfig/vite/vitest configs, `mise.toml` and `eslint.config.js`.

How citations are written:

- `pkg:` means `node_modules/@ui-sdk/react/docs/`.
- `skill:` means `.claude/skills/ui-sdk/`.
- `up:` means the upstream clone (`/private/tmp/claude-502/.../scratchpad/vercel-ui`).

## Upstream examples compared against

The SDK prescribes no general app layout (`docs/research/ui-sdk.md:28`). The closest things it has to a consumer app:

1. **The agents Guide** (`pkg:agents.md:500-810`). This is upstream's only walkthrough of a Vite + React app, and it names the files: `src/App.tsx` (:521), `src/index.css` (:578), `src/agent.ts` (:648, :732), `src/main.tsx` (:662-676). It is the main reference for this audit.
2. **The First Component tutorial** (`pkg:first-component.md:11-37`): `bookmark-button.tsx` next to `app.tsx`, both kebab/lower case, with named `export { X }`.
3. **The skill's consumer examples:**
   - the settings form (`skill:references/build-interface.md:114-181`);
   - the agent test, which imports `./project-settings` from beside the test, so tests sit next to their code (`skill:references/agent-ready.md:74-109`);
   - the test setup at `src/test/setup.ts` (`skill:references/testing.md:17-49`).
4. **Docs component examples:**
   - `up:examples/components/toggle/react/first-component.tsx`
   - `up:examples/components/switch/react/form.tsx`
   - `pkg:components/alert-dialog.md:7-43` (basic) and `:467-497` (confirm from anywhere)

   Their styling rules (`up:contributing/examples.md:7-26`) are for contributors writing docs examples, not for consumers.
5. **The agent benchmark app** (`up:benchmarks/agent/`: `index.html`, `src/main.ts`, `src/screens/react-ui-sdk.tsx`, `src/styles.css`). This is a harness, not guidance. It creates the bridge in the entry before anything mounts (`up:benchmarks/agent/src/main.ts:9-13`).
6. **The library's own tests** (`up:packages/react/test/*.test.tsx`), for naming only. They use `<unit>-<variant>.test.tsx`, e.g. `accordion-ssr.test.tsx` and `agent-own-run.test.tsx`. These are internal to the library and are not consumer guidance.

## Current tree

```
.
├── .claude/skills/ui-sdk/{SKILL.md,references/*.md}
├── .gitignore
├── .pre-commit-config.yaml
├── CLAUDE.md
├── README.md
├── docs/research/ui-sdk.md
├── eslint.config.js            (slated for replacement; ignored)
├── index.html
├── mise.toml                   (slated for removal; ignored)
├── package.json, pnpm-lock.yaml, skills-lock.json
├── tsconfig.json, vite.config.ts, vitest.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.test.tsx
    ├── app.css
    ├── agent.ts
    ├── agent.test.tsx
    ├── agent-production.test.ts
    ├── sections/
    │   ├── section.tsx
    │   ├── toggle-section.tsx      + toggle-section.test.tsx
    │   ├── settings-section.tsx    + settings-section.test.tsx
    │   └── agent-section.tsx       + agent-section.test.tsx
    └── test/setup.ts
```

Note: the directory is not a git repository yet. The global `init.templateDir` pre-commit hook installs on `git init`, and that is not part of this audit.

## Proposed tree

```
.
├── .claude/skills/ui-sdk/...       (tracked; see change G9)
├── .gitignore                      (G8)
├── .pre-commit-config.yaml         (G7)
├── AGENTS.md                       (U2: was CLAUDE.md)
├── CLAUDE.md                       (U2: one line, @AGENTS.md)
├── README.md                       (G5)
├── docs/research/...               (G6: owner decides whether it ships)
├── index.html                      (no change)
├── package.json, pnpm-lock.yaml, skills-lock.json, configs
└── src/
    ├── main.tsx                    (U1: imports ./agent.ts)
    ├── App.tsx
    ├── App.test.tsx                (U4)
    ├── index.css                   (G3: was app.css; G4)
    ├── agent.ts
    ├── agent-webmcp.test.tsx       (G1: was agent.test.tsx)
    ├── agent-production.test.ts    (G1: comment added)
    ├── sections/                   (U5, U6, G2)
    │   └── ... unchanged names
    └── test/setup.ts               (no change)
```

What I checked and found already right (no change):

- `src/agent.ts` at the `src` root (`pkg:agents.md:648`).
- `src/test/setup.ts` holding strict mode, the jsdom stubs and `afterEach(cleanup)` (`skill:references/testing.md:35-49,120-141`).
- Tests next to their code (`skill:references/agent-ready.md:78`).
- Named `export { X }` at the bottom of each file, no default exports and no barrel files (`pkg:first-component.md:20,36`, `pkg:agents.md:376`).
- Imports from per-component entries (`skill:SKILL.md:39`).
- `<OverlayHost />` once near the root (`pkg:components/alert-dialog.md:467`).
- `<output aria-label>` named status regions (`skill:references/testing.md:143`).
- `data-agent-confirm` on `AlertDialogClose value="confirm"`, with "Delete forever" text distinct from the trigger (`skill:references/agent-ready.md:23`).
- `registerTools(agent, { allow: () => true })`, because the bridge's own `allow` already asks (`skill:references/agent-ready.md:66`).
- `import.meta.hot.dispose(unregister)` (`pkg:agents.md:745-752`).
- No `"use client"` (not needed in a Vite SPA; the Guide's Vite files have none, `pkg:agents.md:523-676`).
- The controlled `Input`, because the dialog title needs the name (`skill:references/build-interface.md:71`).
- The `Field`/`Switch` order (`pkg:components/field.md:116-120`).
- The AlertDialog composition (`pkg:components/alert-dialog.md:55-67`).

`src/sections/section.tsx` stays where it is. It is the sections' own wrapper, and a one-file `components/` folder would teach nothing. Upstream says nothing on this.

The mixed casing `App.tsx` + kebab-case elsewhere is exactly upstream's own mix: `src/App.tsx` in the Guide (`pkg:agents.md:521`) next to kebab-case `agent.ts` and `bookmark-button.tsx`. Keep it.

---

## Changes: upstream prescribes these

### U1. Create the bridge from the entry, not from a section

**Problem.** Nothing outside `src/sections/agent-section.tsx:4` imports `src/agent.ts`. If someone copies the template and deletes the agent demo, they silently lose:

- the bridge,
- `window.agent`,
- WebMCP registration,
- the confirm policy.

Today it works only because importing `AgentSection` pulls `agent.ts` in transitively.

**Evidence.**

- "Import `agent.ts` before rendering the app so the bridge sees the Select as it's created" (`pkg:agents.md:662-669`, which shows `import "./agent"` in `main.tsx`).
- "Create the bridge before the page renders" (`pkg:agents.md:46`).
- "importing the entry alone doesn't start registration" (`pkg:agents.md:1650`).
- The benchmark does the same in its entry (`up:benchmarks/agent/src/main.ts:9-13`).

**Edit.** Change `src/main.tsx` so it reads:

```tsx
import "@ui-sdk/core/web.css"
import "./index.css"
import "./agent.ts"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.tsx"
```

Use `./app.css` instead of `./index.css` if G3 is not applied. The rest of the file is unchanged. `web.css` stays first (`pkg:installation.md:43`).

### U2. Make the agent note `AGENTS.md`, with `CLAUDE.md` pointing at it

**Problem.** The template's only agent note is `CLAUDE.md`. Upstream's setup prompt writes the note to `AGENTS.md`, and other agents read only that file.

**Evidence.**

- The setup prompt: "Add a note to AGENTS.md, creating it if needed: before using ui-sdk, follow the ui-sdk skill if it's installed, and read node_modules/@ui-sdk/react/docs/llms.txt. To build a new component, also search node_modules/@ui-sdk/react/docs/core.md by heading, and read rendering.md next to it." (`pkg:llms.txt:26`).
- Upstream's own root `CLAUDE.md` is the single line `@AGENTS.md` (`up:CLAUDE.md:1`).
- Claude Code reads `CLAUDE.md`, not `AGENTS.md`, so the one-line import is needed.

**Edits.**

1. Rename `CLAUDE.md` to `AGENTS.md`.
2. Create `CLAUDE.md` containing exactly `@AGENTS.md`.
3. Replace the body of `AGENTS.md` with the text in U3.

### U3. Correct and trim the agent note

**Problems in the current `CLAUDE.md`:**

- `CLAUDE.md:28-30` says tests never call `createAgent()` "as the skill requires". The skill says the opposite: its agent test calls `createAgent()` itself, one per test file (`skill:references/agent-ready.md:81,112`). The template departs from that on purpose, because components here import the app's bridge. The note should say so.
- `CLAUDE.md:31-32` (mise, TS 6.x) will go stale when the parallel config audit lands. Those lines are left to that auditor and marked below.
- The note lacks the `core.md`/`rendering.md` pointer from the setup prompt.
- The note lacks the pointer to `docs/agents.md` for bridge work. The skill says: "The full docs are the Agents pages: `docs/agents.md`" (`skill:references/agent-ready.md:5`).
- The note lacks the `OverlayHost` dependency (see U7).
- The three-section description in `CLAUDE.md:3-7` describes the demo, not how to work in the repo.

**Replacement text for `AGENTS.md`.** Lines marked `(general)` are not from upstream:

```markdown
# ui-sdk-template

React 19 + Vite + TypeScript template for ui-sdk (https://github.com/vercel-labs/ui).
Single page, no router, no backend, no env vars.

## Before using ui-sdk

Follow the ui-sdk skill (`.claude/skills/ui-sdk/`, also shipped at
`node_modules/@ui-sdk/core/skills/ui-sdk/`) and read
`node_modules/@ui-sdk/react/docs/llms.txt`. To build a new component, also
search `node_modules/@ui-sdk/react/docs/core.md` by heading, and read
`rendering.md` next to it. For the agent bridge, read `docs/agents.md` there.
Do not use memory for this SDK: it is beta, pinned to exactly `0.1.0-beta.16`.

## Layout

- `src/main.tsx` imports `@ui-sdk/core/web.css`, the global stylesheet, and
  `src/agent.ts` before rendering.
- `src/agent.ts` is the app's one bridge: `createAgent` with an `allow` that
  asks the person through `confirm()`, `registerTools` for WebMCP, and
  `window.agent` under `pnpm dev` only. `confirm()` renders through the
  `<OverlayHost />` in `src/App.tsx`; keep it mounted while `agent.ts` uses it.
- Components import `agent` from `src/agent.ts`, so tests use that bridge
  instead of calling `createAgent()` as the skill's example does.
- Tests sit next to their code. `src/test/setup.ts` holds strict mode, jsdom
  stubs and cleanup.

## Rules

- pnpm only. (general)
- Import each component from its own entry (`@ui-sdk/react/toggle`), never a
  package root or `@ui-sdk/core/internal/*`.
- Styling is `@ui-sdk/core/web.css` plus layout CSS in the global stylesheet,
  which starts with `@layer ui-sdk;`. No Tailwind or other UI library. (general)
- Every interface gets the agent test from the skill; tests assert roles,
  names and text.
- <Node/TypeScript pin line: owned by the config audit.>

## Definition of done

`pnpm check` passes (typecheck, lint, test, build).
```

Applying U3 also covers two smaller points:

- The SDK-version bullets in `CLAUDE.md:11-19` are kept and condensed.
- The upstream commit SHA moves to G9.

### U4. Add a page-level agent test to `src/App.test.tsx`

**Problem.** Agent tests exist only per section, in `settings-section.test.tsx:77` and `agent-section.test.tsx:7`. So:

- the Toggle section's **Bookmark** has no agent test;
- nothing checks that labels stay unique across the whole page.

**Evidence.**

- "Write this test for every interface you build" (`skill:references/agent-ready.md:72`).
- "List every control the task names in the labels check … Add one act step for every control" (`:114`).
- "Labels should be unique where they sit" (`:9`).
- The bridge "still sees the page behind an open modal" (`:14`).
- `skill:SKILL.md:54`.

**Edit.** Append to `src/App.test.tsx`, reusing its existing `agent` import:

```tsx
test("an agent finds every control on the page by a name of its own", async () => {
  render(<App />)

  const components = agent
    .snapshot()
    .filter((entry) => !entry.offPage && entry.component !== "more")
  for (const entry of components) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
  }
  const labels = components.map((entry) => entry.label)
  for (const label of [
    "Bookmark",
    "Project name",
    "Visibility",
    "Weekly digest",
    "Save settings",
    "Delete project",
    "Mute",
    "Run agent demo",
    "Run risky agent step",
  ]) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label)
  }
  expect(new Set(labels).size, "two controls share a label").toBe(labels.length)

  const result = await agent.act({
    steps: [{ ref: "Bookmark", action: "setPressed", args: [true] }],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole("button", { name: "Bookmark" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
})
```

**UNCONFIRMED.** I did not run this. Two things to check:

- Whether "Delete project" shows up as its own entry, or as the AlertDialog's entry labelled by its title.
- Whether the uniqueness check holds.

Before fixing the label list, log the snapshot once, as `skill:references/agent-ready.md:136` says. `setPressed` on a Toggle is already used at `src/sections/agent-section.tsx:13`.

### U5. Close the keyboard and focus gaps in the section tests

**Evidence.** The skill asks for all of the following (`skill:references/testing.md:7`):

- "press Space on every switch or checkbox you placed, not just one";
- "check that closing a dialog or menu returns focus where it should";
- "Press each button in every dialog … and check what happened".

**Edits.**

1. `src/sections/settings-section.test.tsx:18`. The Weekly digest switch is only clicked. Add a test, or extend the first one, that:
   - focuses `screen.getByRole("switch", { name: "Weekly digest" })`;
   - presses `user.keyboard(" ")`;
   - asserts `not.toBeChecked()`, then presses Space again and asserts `toBeChecked()`.
2. `src/sections/settings-section.test.tsx:55`. After "Delete forever" closes the dialog, add `expect(trigger).toHaveFocus()`. Line 48 already does this for Cancel. **UNCONFIRMED** that focus returns to the trigger after a confirming close. Run it, and if it fails, mark it `test.fails` with a reason, as `skill:SKILL.md:54` says.
3. `src/App.test.tsx:31` (the Refuse path of the `confirm()` dialog). Assert where focus lands after the prompt closes. **UNCONFIRMED** where that is: `confirm()` has no trigger. Find out with a throwaway probe test (`skill:references/create-component.md:15`) before writing the assertion. The likely candidate is the "Run risky agent step" button.

### U6. Fix the Agent section caption, which the docs contradict

**Problem.** `src/sections/agent-section.tsx:36` says "registerTools plus window.agent expose the bridge to browser agents (WebMCP)". The docs say "`window.agent` is for the console exercise; WebMCP calls the bridge directly" (`pkg:agents.md:754`). The sentence also says `window.agent` twice.

**Edit.** Replace the `caption` with:

> createAgent lets an agent read and drive these components by name through their actions. Anything marked data-agent-confirm waits for a person. registerTools offers the bridge to WebMCP browsers, and under pnpm dev it is also window.agent in the console.

### U7. State the `OverlayHost` dependency where a copier will see it

**Problem.** `src/agent.ts:10-15` calls `confirm()`, which only renders when an `<OverlayHost />` is mounted (`pkg:components/alert-dialog.md:467`). Without the host, a marked step's `allow` promise never settles until the 5-minute timeout (`pkg:agents.md:1117`). The only host is `src/App.tsx:13`, in a file a template user will rewrite first.

**Edit.** This is covered by the U3 text and by G5's "Using this template" list. No code change is needed: the host is already "near your app's root". Optionally, move it out of `<main>` into a fragment sibling so it does not read as page content. That last part is general, not upstream.

---

## Changes: general convention (upstream says nothing)

### G1. Name the two agent-only test files for what they test, and say why they are separate

**Problem.** The two files exist for real reasons:

- `src/agent.test.tsx` tests only the WebMCP path, plus one `window.agent` check at line 22.
- `src/agent-production.test.ts` tests the DEV gate.

Each must get a fresh copy of `agent.ts` loaded after a global is stubbed. `agent.ts` acts when it is imported, and the skill allows one bridge per file (`skill:references/agent-ready.md:112`; the bridge has no `destroy`, `pkg:agents.md:1661`). A reader sees none of this in the files.

**Edits.**

1. Rename `src/agent.test.tsx` to `src/agent-webmcp.test.tsx`. The `<unit>-<variant>.test.tsx` pattern follows upstream's own tests (`up:packages/react/test/agent-own-run.test.tsx`, `accordion-ssr.test.tsx`).
2. Keep `src/agent-production.test.ts`; its name already fits that pattern.
3. Add this one-line comment as line 1 of each file. `skill:SKILL.md:48` allows a comment for a trade-off.

   ```ts
   // Own file: agent.ts acts on import, so it is imported after the stub, once per file.
   ```

### G2. Remove the duplicated region test

`src/sections/toggle-section.test.tsx:23-28` repeats one case of `src/App.test.tsx:7-16`, which already checks all three sections. Delete lines 22-28 (the blank line and the test).

### G3. Rename `src/app.css` to `src/index.css` (owner judgement)

The Guide's global stylesheet is `src/index.css`, imported from `main.tsx` (`pkg:agents.md:578,669`). That name matches what Vite's `react-ts` template generates, which the Guide starts from (`pkg:agents.md:511`). The Vite side is **UNCONFIRMED**: I did not fetch the current Vite template. This is precedent, not a rule.

**Edits.**

- `git mv src/app.css src/index.css` (plain `mv` until the repo is initialised).
- Update `src/main.tsx:2`; this is already in U1's text.
- Update `CLAUDE.md`/`AGENTS.md` and `README.md` mentions of `src/app.css`.

### G4. Give page text the SDK's font and colours, and drop a dead fallback

**Problem.** `web.css` defines `--ui-*` tokens on `:where(:root, :host)` but has no `body`/`html` rule. I extracted its rules and found only that root block and `[data-slot="field"]`. So headings and captions render in the browser's default font, while controls use `--ui-font-sans`. **UNCONFIRMED visually**: I did not open a browser. Also, `src/app.css:14` `var(--ui-muted-foreground, inherit)` never needs its fallback, because `web.css` is always imported first.

**Edits** to the global stylesheet:

- Add after line 1:

  ```css
  body {
    margin: 0;
    background: var(--ui-background);
    color: var(--ui-foreground);
    font-family: var(--ui-font-sans);
  }
  ```

- Change `.caption`'s colour to `var(--ui-muted-foreground)`.
- Check the caption's contrast in a real browser (`skill:SKILL.md:45`, `skill:references/styles.md:63-66`).

### G5. README: fix one garbled passage and add what a template needs

**Problems and edits in `README.md`:**

1. Lines 29-34 run sentences together ("…allow or refuse it first. The tests follow…") and repeat the `window.agent`/WebMCP point. Replace item 3 with:

   > **Agent bridge** (`src/agent.ts`, `src/sections/agent-section.tsx`): `createAgent` lets an agent read and drive the same components by name. "Run agent demo" mutes through the bridge; "Run risky agent step" presses the settings form's Delete forever, which is marked `data-agent-confirm`, so you are asked first. `registerTools` offers the bridge to WebMCP browsers, and under `pnpm dev` it is `window.agent` in the console (try `await window.agent.snapshot()`).

2. Add a **Requirements** line. The Node version source is owned by the config audit.
3. Add a **Using this template** section:
   - rename `name` in `package.json` and `<title>` in `index.html`;
   - replace the three sections;
   - keep `src/agent.ts`, its import in `src/main.tsx`, `<OverlayHost />` (needed by the bridge's `confirm()`, U7), `src/test/setup.ts`, and one agent test per interface;
   - note that "Run risky agent step" targets the settings form, so delete them together (see judgement call J3).
4. Add a short **Layout** list mirroring the AGENTS.md "Layout" section.
5. **Licence:** the repo has none. Whether and which is the owner's call. (Upstream is Apache-2.0, `up:LICENSE`, which says nothing about what a consumer should use.)

### G6. Decide whether process notes ship with the template (owner judgement)

`docs/research/ui-sdk.md` (and this audit) record how the app was built. The research note has dated corrections at :176-183 and paths into a scratch clone. People who copy the template inherit them.

Two options:

- **(a)** Keep `docs/research/` and add one README line saying it is provenance, not instructions.
- **(b)** Remove it from the published template and keep it in the owner's notes.

Either way, `AGENTS.md` should point at the package docs and skill, not at the research note. U3's text already does. Today `CLAUDE.md:22` sends agents to the research note first.

### G7. Clean the copied starter comments out of `.pre-commit-config.yaml`

**Problem.**

- Lines 1-2 tell the reader to copy the file into a repo root, which is where it already is.
- Lines 26-32 are a commented Python/ruff block that does not apply to a TS template.

**Edits.**

- Delete lines 1-2 and 26-32.
- Keep lines 4-6: the rotate-first note is useful.

This may overlap the parallel lint-tooling audit. Defer to it if it owns this file.

### G8. `.gitignore`: add logs

Add `*.log`. Upstream ignores it (`up:.gitignore:11`), and pnpm/vite debug logs otherwise get committed. Everything else in the current file is right:

- `node_modules`, `dist`, `coverage`, `*.tsbuildinfo`, `.env*` with `!.env.example`;
- `.claude/worktrees/`, as upstream has (`up:.gitignore:39`);
- `.claude/settings.local.json`.

Do not ignore `.claude/skills/` or `skills-lock.json` (G9).

### G9. Track `.claude/skills/ui-sdk/` and `skills-lock.json`, and record how to bump them

**Reasons to track them:**

- Claude Code finds skills only under `.claude/skills/`, so a fresh clone needs the folder before `pnpm install`.
- `skills-lock.json` pins source, commit and hash. Its role as a lockfile meant to be committed is **UNCONFIRMED**: I could not read the skills CLI docs offline.
- Upstream tracks its own agent skills in-repo (`git ls-files .agents` lists them). Those are contributor skills, not consumer guidance.

**Risk.** The copy can drift from the installed package. The docs say the package copy "always matches the version you installed" (`pkg:agents.md`, Skills section). Today they are identical.

**Edit.** Add to `AGENTS.md` under "Before using ui-sdk":

> When bumping `@ui-sdk/*`, re-run `pnpm dlx skills@latest add vercel-labs/ui --skill ui-sdk -a claude-code -y` and check `diff -r .claude/skills/ui-sdk node_modules/@ui-sdk/core/skills/ui-sdk` is empty.

That command comes from `docs/research/ui-sdk.md:181`.

There is an alternative; see judgement call J2.

### G10. Layout vocabulary in CSS (owner judgement, optional)

**Current state.** `src/app.css` uses classes: `.row`, `.caption` and `.inline`. Upstream's docs examples, which readers will copy, use layout slots instead:

- `data-slot="row"` and `data-slot="stack"` (`pkg:components/alert-dialog.md:24,31`);
- the slot rules in `up:contributing/examples.md:10`.

`web.css` does not style those slots. Contributor rules are not consumer rules, and the skill only says to style state from `data-slot` and state attributes (`skill:SKILL.md:43`). So classes are allowed.

**If the owner wants docs snippets to drop in with layout:**

- Rename `.row` to `[data-slot="row"]` and `.caption` to `[data-slot="hint"]`.
- Change `className="row"` to `data-slot="row"` in `toggle-section.tsx`/`agent-section.tsx` (`agent-section.tsx:38,46`) and in `section.tsx:15`.
- Keep `.inline` as a class, because a part's own `data-slot` cannot be replaced (`up:contributing/examples.md:12`). The rule it implements is the one `skill:references/styles.md:49` prescribes ("A checkbox beside its label inside a Field needs `flex-direction: row`").

### G11. Note only, no change: import specifiers carry `.ts`/`.tsx`

Upstream's app snippets import without extensions: `"./agent"`, `"./App"` (`pkg:agents.md:665-668`) and `"./project-settings"` (`skill:references/agent-ready.md:78`). The template's style depends on `allowImportingTsExtensions`, which is config and out of scope. Both work. This is for the config auditor to settle, so the import style follows whatever the config allows.

---

## Agent layer verdict (task item 3)

**Module boundary.** `src/agent.ts` matches the Guide's final `src/agent.ts` (`pkg:agents.md:734-750`):

- `createAgent` at module top;
- `Object.assign(window, { agent })`;
- `registerTools` plus `import.meta.hot.dispose(unregister)`;
- `export { agent }`.

It differs from the Guide in two places:

- The `allow` is the skill's "ask the person" form (`skill:references/agent-ready.md:56-59`), built on the documented `confirm()` and `confirm.controller` (`pkg:components/alert-dialog.md:467,568`). It closes the prompt when the signal aborts (`pkg:agents.md:1117`).
- `window.agent` is behind `import.meta.env.DEV`. The Guide's is unconditional. That is a reasonable hardening, and upstream says nothing on it.

**Side effects on import.** There are three: the bridge, `window.agent`, and the WebMCP registration. All three are upstream's own shape, so nothing here surprises someone who knows the Guide. They do cost something:

- Tests: two extra test files with a stub-then-dynamic-import trick (G1).
- Entry: the bridge's existence depends on who imports the module (U1).

**HMR.** Editing `agent.ts` re-runs it through its importers. The dispose removes the old WebMCP tools, but the old bridge cannot be destroyed (`pkg:agents.md:1661`), so a second bridge lives until reload. **UNCONFIRMED** (not exercised). Upstream's Guide has the same property and only says "Reload the page after saving" (`pkg:agents.md:754`).

## Test organisation verdict (task item 4)

**Placement and setup:** match the skill (see "already right").

**Names:** sentence-style `test(...)` titles that describe behaviour. Good.

**Shared helpers:** none. The agent label-check loop is repeated in two files, and will be in three after U4. Keep it inline, because it is the skill's copyable form (`skill:references/agent-ready.md:84-96`). Extracting a helper would hide the pattern the template exists to teach.

**Duplication:** fixed by G2.

**Coverage against the skill's testing guidance:**

| Area | Status |
|---|---|
| Keyboard | Toggle: done (`toggle-section.test.tsx:16-20`). Switch: gap (U5). |
| Focus | Cancel: done (`settings-section.test.tsx:48`). Confirm and agent prompt: gaps (U5). |
| ARIA | Roles, names, `aria-pressed` and descriptions: done. |
| Required empty submit | Done (`settings-section.test.tsx:26-34`). |
| Agent snapshot/act | Done per section. Page-level and Bookmark: gap (U4). |
| `data-agent-confirm` refuse then run | Done through the real UI (`App.test.tsx:18-44`). The skill's flip-`allow` form isn't needed because the app's bridge is used. |
| WebMCP mock | Matches `skill:references/testing.md:145-164`. |

`checkPattern` is correctly not used on shipped components (`skill:references/testing.md:55`).

## Judgement calls for the owner

- **J1. Option B for `agent.ts` instead of the Guide's shape.** Export a `connectAgent()` from `agent.ts` that sets `window.agent` and calls `registerTools`, returning the cleanup. Call it from `main.tsx`, with the HMR dispose there. That removes two of the three side effects on import, and it would let `agent-webmcp.test.tsx` and `agent-production.test.ts` fold into one `agent.test.tsx` with no dynamic imports. It departs from `pkg:agents.md:734-750`, which this template exists to mirror. I recommend keeping the Guide's shape (U1 + G1).
- **J2. A symlink instead of a tracked copy of the skill.** Point `.claude/skills/ui-sdk` at `../../node_modules/@ui-sdk/core/skills/ui-sdk`. It matches the installed version by construction and makes `skills-lock.json` unnecessary, but it breaks before `pnpm install` and on Windows checkouts. G9 assumes the tracked copy.
- **J3. Where the "Run risky agent step" button lives.** It sits in `agent-section.tsx:48` but acts on the settings form's dialog, so the Agent section alone cannot demo or test it. `agent-section.test.tsx` never presses it, and `App.test.tsx` does. The options are to move it into the settings section, or to keep it and document the coupling (G5).
- G3 (rename `app.css`), G6 (ship `docs/research/`), G10 (slot vocabulary), and the licence.

## Not verified

- The exact snapshot labels in U4, and the focus targets in U5 (2) and (3). Run them first.
- Visual effect of G4, and contrast. Not opened in a browser.
- The current Vite `react-ts` template's file names (G3), and the skills CLI's intended use of `skills-lock.json` (G9). Not fetched.
- The HMR double-bridge behaviour.
