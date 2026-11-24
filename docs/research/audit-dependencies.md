# Dependency and tooling audit

Date: 2026-11-24. Scope: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `mise.toml`, `skills-lock.json`. Nothing in the project was changed except this file.

How it was checked:
- Registry: `pnpm view <pkg> version dist-tags peerDependencies engines time`, `pnpm outdated`, `pnpm why`, `pnpm audit`, `pnpm dedupe --check`, `pnpm install --frozen-lockfile --lockfile-only` (lockfile byte-identical afterwards).
- Installed packages: `node_modules/@ui-sdk/*` package.json, `node_modules/@ui-sdk/core/skills/ui-sdk/` (identical to `.claude/skills/ui-sdk/`, `diff -r`).
- Upstream clone `vercel-labs/ui` at `074ac1c` (read only; nothing run from it). `U:` below means that clone.
- create-vite 9.3.4 (latest) `template-react-ts`, unpacked in the scratchpad, as the current Vite reference. (The tarball was fetched with `npm pack` in the scratchpad, outside the project; no project impact.)
- **Simulation:** a scratchpad copy of the app with every change below applied (ESLint stack removed, TypeScript 7.0.2, oxlint 1.95.0 + oxlint-tsgolint 7.0.2008, the proposed `.oxlintrc.json` and `tsconfig.json`). Results: `tsc --noEmit` exit 0, `vitest run` 6 files / 14 tests pass, `vite build` succeeds, `oxlint` exit 0 after the one code fix in change 3. Install needed no build-script approvals.

## Mise and ESLint: does upstream tell consumers anything?

- **mise:** upstream says nothing to consumers. No `mise` in the clone (`rg -i '\bmise\b'` over everything but the lockfile: no hits) and none in the installed docs or skill. Published packages declare no `engines` (`U:packages/*/package.json`). Remove `mise.toml` as decided.
- **ESLint:** upstream says nothing to consumers. The consumer skill's checks are type-check, tests and a real browser (`node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md:51-56`, `references/testing.md`), and the docs have no lint guidance (`rg -i 'eslint|prettier|lint'` over `U:packages/core/skills` and `U:apps/docs/content` finds only `scrollIntoView`). Remove ESLint as decided.

What upstream's own repo uses (the authors' taste for contributing, not advice to consumers):

| Job | Upstream repo | Evidence |
|---|---|---|
| Lint | ESLint 10 + typescript-eslint (parser only) + `eslint-plugin-react-hooks` `flat.recommended` on React code, run as `lint:idioms`. The main `lint` script is custom node scripts. | `U:package.json:12-13`, `U:eslint.config.mjs:1-65` |
| Format | Prettier 3: `semi: false`, `singleQuote: false`, `trailingComma: "es5"`, `printWidth: 80`, `tabWidth: 2`, `endOfLine: "lf"` | `U:.prettierrc:1-9`, `U:package.json:14-15` |
| Type-check | **TypeScript 7.0.2** (`typescript7: npm:typescript@7.0.2`) for plain checks. TypeScript 5.9 stays only for tools that use its JS API (vue-tsc, svelte-check). | `U:pnpm-workspace.yaml` catalog, `U:packages/react/package.json` `typecheck` uses `scripts/tsgo.mjs` |
| Unit tests | Vitest 5 + jsdom (`vitest ^5.0.3`, `jsdom ^30.1.2`) | `U:packages/react/package.json:386,398-408` |
| Browser tests | Playwright | `U:tests/package.json` |
| Bundling | Rolldown + esbuild for packages; Vite 8 for the playground | `U:package.json` devDeps, `U:apps/playground/package.json` |
| Node pin | `.nvmrc` = `24`, read by CI through `actions/setup-node` `node-version-file: .nvmrc` | `U:.nvmrc`, `U:.github/workflows/release.yml:34-36` |
| pnpm pin | `"packageManager": "pnpm@10.34.5"` | `U:package.json:5` |
| pnpm policy | `minimumReleaseAge: 1440`, `trustPolicy: no-downgrade`, `blockExoticSubdeps: true`, `allowBuilds: { esbuild: true }` | `U:pnpm-workspace.yaml` |

The current Vite starter (create-vite 9.3.4 `template-react-ts`) also ships oxlint and `typescript ~7.0.2`, not ESLint (`template-react-ts/package.json`, `_oxlintrc.json`).

## Dependency table

Installed = lockfile and `pnpm ls`. Latest = registry `latest` dist-tag on 2026-11-24.

| Package | Section | Specifier | Installed | Latest | Verdict |
|---|---|---|---|---|---|
| `@ui-sdk/core` | deps | `0.1.0-beta.16` | 0.1.0-beta.16 | 0.1.0-beta.16 (`latest` and `beta`) | Keep, exact. Must be direct: it is a peer of `@ui-sdk/react` (`^0.1.0-beta.16`) and `src/main.tsx:1` imports `@ui-sdk/core/web.css`. |
| `@ui-sdk/react` | deps | `0.1.0-beta.16` | 0.1.0-beta.16 | 0.1.0-beta.16 | Keep, exact. Peers: `react >=19`, `react-dom >=19`, `@types/react >=19.2.10` (optional), `@ui-sdk/core ^0.1.0-beta.16`. All satisfied. |
| `react` | deps | `19.3.1` | 19.3.1 | 19.3.1 | Keep. Range policy: see change 8. |
| `react-dom` | deps | `19.3.1` | 19.3.1 | 19.3.1 | Keep. Peer `react ^19.3.1`. |
| `@testing-library/dom` | dev | `^10.4.2` | 10.4.2 | 10.4.2 | Keep. Peer of `@testing-library/react` (`^10.0.0`) and user-event. The skill's install line lists it (`references/testing.md:14`). |
| `@testing-library/jest-dom` | dev | `^8.0.0` | 8.0.0 | 8.0.0 | Keep. Not in the skill's install line (`testing.md:14`), but the tests use its matchers about 30 times (`toHaveTextContent`, `toBeEmptyDOMElement`, `toHaveAccessibleDescription`...), and they assert what a user sees. Peers `vitest >=5 <6`, `@testing-library/dom >=10 <11`. Satisfied. |
| `@testing-library/react` | dev | `^16.3.3` | 16.3.3 | 16.3.3 | Keep. In the skill's list. |
| `@testing-library/user-event` | dev | `^14.6.13` | 14.6.13 | 14.6.13 | Keep. In the skill's list. |
| `@types/react` | dev | `^19.3.0` | 19.3.0 | 19.3.0 | Keep. Peer of `@ui-sdk/react`. The `ts7.0` dist-tag points at 19.3.0, so it supports TypeScript 7. |
| `@types/react-dom` | dev | `^19.3.0` | 19.3.0 | 19.3.0 | Keep. Types for `react-dom/client` in `main.tsx`. Peer `@types/react ^19.3.0`. `ts7.0` tag = 19.3.0. |
| `@vitejs/plugin-react` | dev | `^6.3.0` | 6.3.0 | 6.3.0 | Keep. Peer `vite ^8.0.0`. Its other peers (babel, React Compiler, oxc-transform-react) are optional and unused. |
| `jsdom` | dev | `^31.0.1` | 31.0.1 | 31.0.1 | Keep. In the skill's list. Node engines `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`, the tightest in the tree. |
| `typescript` | dev | `~6.0.3` | 6.0.3 | **7.0.2** | **Upgrade to `~7.0.2`** (change 2). |
| `vite` | dev | `^8.3.8` | 8.3.8 | 8.3.8 | Keep. No TypeScript peer. |
| `vitest` | dev | `^5.1.1` | 5.1.1 | 5.1.1 | Keep. Peers `vite ^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0`, `jsdom *`. No TypeScript peer. |
| `@eslint/js` | dev | `^10.0.1` | 10.0.1 | 10.0.1 | **Remove** (change 1). |
| `eslint` | dev | `^10.15.0` | 10.15.0 | 10.15.0 | **Remove** (change 1). |
| `eslint-plugin-react-hooks` | dev | `^7.1.1` | 7.1.1 | 7.1.1 | **Remove** (change 1). oxlint's `react` plugin covers its rules (see change 1). |
| `globals` | dev | `^17.14.0` | 17.14.0 | 17.14.0 | **Remove** (change 1). Only `eslint.config.js` uses it. oxlint has `env`. |
| `typescript-eslint` | dev | `^8.73.0` | 8.73.0 | 8.74.0 | **Remove** (change 1). It is what held TypeScript back: peer `typescript >=4.8.4 <6.1.0` (8.73.0). |
| `oxlint` | dev (new) | — | — | 1.95.0 | **Add `^1.95.0`** (change 1). Engines `^20.19.0 \|\| >=22.12.0`. Peer `oxlint-tsgolint >=7.0.2008` (optional). |
| `oxlint-tsgolint` | dev (new) | — | — | 7.0.2008 | **Add `^7.0.2008`** for type-aware rules (change 1). Platform binaries only, no install scripts. |
| `oxfmt` | dev (optional) | — | — | 0.80.0 | Optional, owner's call (change 7). |

Redundant or misplaced: nothing in `dependencies` is misplaced. The only redundant packages are the five ESLint ones. `@types/node` is correctly absent: the config files use no Node APIs, and `tsc` passes without it. (create-vite adds it for `tsconfig.node.json`, which this repo does not need.)

### SDK beta status

No newer `@ui-sdk/*` than 0.1.0-beta.16 exists. `latest` and `beta` both point at it, published 2026-11-23T12:54Z. Published betas: 1-10, 12, 13, 14, 16 (11 and 15 were never published). beta.16's changelog entry for `@ui-sdk/react` is only "Updated @ui-sdk/core to 0.1.0-beta.16" (`U:packages/react/CHANGELOG.md`). Upstream HEAD `074ac1c` carries about 20 unreleased `@ui-sdk/core` patch changesets (`U:.changeset/*.md`). Examples: toasts no longer throw without `ResizeObserver`, a `keydown` with no `key` no longer throws, the agent's `setValue` handles number-valued Select items. These come in the next beta. None needs action now.

The pinned skill (`skills-lock.json`, commit `074ac1c`) is byte-identical to the copy shipped in beta.16 (`diff -r`), so the skill and the package do not drift today.

### TypeScript 7 compatibility (with ESLint gone)

Nothing left in the tree declares a TypeScript peer. Evidence:
- `@ui-sdk/react` peers: none on `typescript`. `@types/react`/`@types/react-dom`: the `ts7.0` dist-tag is 19.3.0.
- `vite` 8.3.8 and `vitest` 5.1.1 peers: none on `typescript`.
- `oxlint-tsgolint` 7.0.2008: no `typescript` peer. It bundles its own TypeScript-Go and reads `tsconfig.json`.
- Upstream type-checks its React package with TypeScript 7.0.2. create-vite ships `~7.0.2`.
- Simulation: `tsc` 7.0.2 `--noEmit` exit 0 on this app. Vitest and the Vite build pass.
- TypeScript 7.0.2 was published 2026-07-08 (stable for over four months). `7.1.0-beta` exists; stay on `~7.0.2`.
- Caveat: the `typescript` 7 package's JS API is `unstable/*` only. Nothing here uses it (no vue-tsc, svelte-check or typescript-eslint).

## Change instructions

Severity: **High** = needed for the decided direction or for `pnpm check` to pass. **Medium** = wrong or stale without it. **Low** = hygiene.

### 1. Replace ESLint with oxlint (High)

1. Run `pnpm remove @eslint/js eslint eslint-plugin-react-hooks globals typescript-eslint`.
2. Delete `eslint.config.js`.
3. Run `pnpm add -D oxlint@^1.95.0 oxlint-tsgolint@^7.0.2008`.
4. Create `.oxlintrc.json`. It must stay plain JSON with no comments, because `.pre-commit-config.yaml` runs `check-json`.

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "react", "jsx-a11y"],
  "categories": {
    "correctness": "error"
  },
  "env": {
    "browser": true,
    "builtin": true
  },
  "ignorePatterns": [".claude/**"],
  "options": {
    "typeAware": true,
    "denyWarnings": true,
    "reportUnusedDisableDirectives": "error"
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/unsupported-syntax": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  },
  "overrides": [
    {
      "files": ["src/**/*.test.{ts,tsx}", "src/test/**"],
      "plugins": ["vitest"],
      "rules": {
        "vitest/valid-expect": ["error", { "maxArgs": 2 }]
      }
    },
    {
      "files": ["*.config.ts"],
      "env": { "browser": false, "node": true }
    }
  ]
}
```

5. In `package.json`, set `"lint": "oxlint"`.

Why each part:
- The base (`react`/`typescript`/`oxc` plugins, `rules-of-hooks`, `only-export-components` with `allowConstantExport`, `typeAware`) is create-vite's own `_oxlintrc.json` and its README's "Expanding the Oxlint configuration" section (create-vite 9.3.4 `template-react-ts/README.md:14-30`).
- `react` + `correctness` turns on oxlint's versions of the React Compiler rules that `eslint-plugin-react-hooks` 7 `flat.recommended` had: `exhaustive-deps`, `purity`, `refs`, `immutability`, `globals`, `set-state-in-effect`, `set-state-in-render`, `static-components`, `use-memo`, `preserve-manual-memoization`, `incompatible-library`, `error-boundaries` (`oxlint --rules -f json`: all `correctness`). `rules-of-hooks` (category `pedantic`) and `unsupported-syntax` (`restriction`) are outside correctness, so they are listed explicitly. The plugin's `config` and `gating` rules only matter with the React Compiler, which this app does not use. Nothing is lost by dropping the ESLint plugin, and no `jsPlugins` bridge is needed.
- `jsx-a11y`: all 35 of its rules are `correctness`. They find nothing in the current code.
- `vitest` is scoped to tests. `valid-expect` defaults to `maxArgs: 1` (schema `ValidExpectConfig`). That gives a false positive on Vitest's own `expect(value, message)`, used at `src/sections/agent-section.test.tsx:27` and `src/sections/settings-section.test.tsx:101`, so `maxArgs` is 2.
- Do not enable the `suspicious` category. In the simulation it flagged the skill's verbatim setup code: `no-underscore-dangle` on `__UI_SDK_STRICT__`, `no-unsafe-type-assertion` on `[] as unknown as DOMRectList` (`references/testing.md:41-44,128`).
- `.gitignore` already excludes `node_modules`, `dist` and `coverage`, and oxlint honours it (`oxlint --debug=files` lists only `src/**` and the two config files). `.claude/**` is added because the old ESLint config ignored it.

**Type-aware linting: worth it, keep `typeAware: true`.** It adds one devDependency (platform binaries, no build script). `oxlint` took 0.74 s on this repo with type-aware on, against 0.46 s without. It found a real issue on the first run (change 3). It brings `no-floating-promises`, `await-thenable` and `no-misused-promises`, which suit the async agent code (`agent.act`, `confirm`). Keep `tsc --noEmit` as `typecheck` anyway, because the authors' skill prescribes `tsc` (`SKILL.md:53`). Do not enable oxlint's `typeCheck` option as a replacement.

### 2. TypeScript `~6.0.3` to `~7.0.2` (High)

1. Run `pnpm add -D typescript@~7.0.2`.
2. Keep the `~` (create-vite uses `~7.0.2`, because TypeScript minors can break).

Evidence: the "TypeScript 7 compatibility" section above. `typescript-eslint` was the only blocker (peer `<6.1.0`) and change 1 removes it.

### 3. Fix the type-aware lint error in `src/sections/settings-section.tsx` (High; `pnpm check` fails without it)

`typescript/no-base-to-string` errors on line 33, twice. `FormData.get` returns `FormDataEntryValue | null`, which can be a `File`, so `String(...)` could print `[object File]`. Both fields are text (Input and Select), so assert the type:

```tsx
`Saved ${data.get("name") as string}: ${data.get("visibility") as string}, weekly digest ${digest}`
```

replacing

```tsx
`Saved ${String(data.get("name"))}: ${String(data.get("visibility"))}, weekly digest ${digest}`
```

Verified in the simulation: oxlint exit 0, tsc exit 0, all 14 tests pass.

### 4. Remove mise and declare Node and pnpm the conventional way (Medium)

1. Delete `mise.toml`.
2. Add `.nvmrc` containing `24` (one line). This matches upstream (`U:.nvmrc`), and nvm, fnm and `actions/setup-node` (`node-version-file`) all read it. Node 24 also satisfies every engines range in the tree (installed: v24.19.0).
3. Add to `package.json`: `"packageManager": "pnpm@11.22.0"`. That is the pnpm that wrote the lockfile (`node_modules/.modules.yaml`: `packageManager: pnpm@11.22.0`). pnpm switches to the pinned version when another one runs ("When a command runs with a different pnpm version, pnpm switches to the pinned one", https://pnpm.io/package_json). Upstream pins pnpm the same way (`U:package.json:5`).
4. Add to `package.json`: `"engines": { "node": "^22.22.2 || ^24.15.0 || >=26.0.0" }`. This is the intersection of the tree's requirements: jsdom `^22.22.2 || ^24.15.0 || >=26.0.0`, vitest `^22.12.0 || ^24.0.0 || >=26.0.0`, vite/oxlint `^20.19.0 || >=22.12.0`, jest-dom `>=22`. Without `engineStrict` it only warns (pnpm docs), so it documents rather than enforces.

Note for the owner's machine: mise does not read `.nvmrc` unless `idiomatic_version_file_enable_tools = ["node"]` is set (https://mise.jdx.dev/configuration.html). The global mise `node = "lts"` (24.19.0) already satisfies the range, so nothing breaks either way. Not chosen: `devEngines.runtime` (pnpm-native Node download). The pnpm docs describe it mainly with pnpm 12 version notes, and nothing upstream uses it.

### 5. Update docs that state the old setup (Medium)

- `CLAUDE.md`, the Rules bullet "Node is pinned in `mise.toml`. TypeScript is held at 6.x because typescript-eslint does not support TS 7 yet." Replace it with: "Node 24 is declared in `.nvmrc` and `engines`; pnpm is pinned by `packageManager`. Lint is oxlint (type-aware, `.oxlintrc.json`)."
- `docs/research/ui-sdk.md:180,182`: line 180 says the app pins Node via `mise latest node@lts`, and line 182 records the typescript-eslint hold. Add a dated correction under "Corrections and verification" instead of editing history.
- README needs no change: it names `pnpm lint` without the tool.

### 6. tsconfig.json updates (Low)

Target file (verified with TS 7.0.2 in the simulation):

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

Changes and reasons:
- Drop `"DOM.Iterable"`. It is redundant: `node_modules/typescript/lib/lib.dom.iterable.d.ts` (6.0.3) says "This file's contents are now included in the main types file". create-vite's `tsconfig.app.json` uses `["ES2023", "DOM"]`.
- `target` `ES2022` to `ES2023`, to match `lib`, as create-vite does. It changes nothing at runtime: `noEmit`, and Vite sets its own build target.
- Add `erasableSyntaxOnly` and `moduleDetection: "force"`, both from create-vite's `tsconfig.app.json`. No current code uses enums, namespaces or parameter properties, so nothing breaks.
- Keep `strict: true`. TypeScript 7 already defaults to strict (verified: a config without `strict` reports TS7006 and TS2322), but the explicit flag matches upstream's `tsconfig.base.json` and the "TypeScript (strict)" line in CLAUDE.md. Keep `noUncheckedIndexedAccess`, a deliberate extra over upstream, which sets it to `false`.
- Keep `isolatedModules`. Upstream's base keeps it alongside `verbatimModuleSyntax`, and it is harmless.
- Keep a single tsconfig. The skill warns that a `"files": []` + references root makes `tsc --noEmit` check nothing (`SKILL.md:53`), and the config files need no Node types here. create-vite's app/node split is not needed.

### 7. Formatter (Low; owner's call)

Upstream uses Prettier with `semi: false, trailingComma: "es5", printWidth: 80` (`U:.prettierrc`), and the code here already follows that style except three over-long lines. If a formatter is wanted, oxfmt (same toolchain as oxlint, Prettier-compatible, `--migrate prettier` available) fits:

1. Run `pnpm add -D oxfmt@^0.80.0`.
2. Create `.oxfmtrc.json`:

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "semi": false,
  "trailingComma": "es5",
  "printWidth": 80
}
```

oxfmt's defaults differ: `printWidth` 100, `trailingComma` "all".
3. Add scripts: `"format": "oxfmt"`, `"format:check": "oxfmt --check"`.
4. Change `check` to `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`.
5. Run `pnpm format` once.

Simulation: that one run rewraps lines in `src/agent.test.tsx`, `src/sections/agent-section.tsx` and `src/sections/settings-section.test.tsx`, and reorders `package.json` keys (`private` after `version`). Skipping a formatter is also defensible for a hello world: upstream gives consumers no formatting advice.

### 8. Version-range policy (Low; owner's call)

Today, `@ui-sdk/*` and `react`/`react-dom` are exact, but `@types/react*` and every devDependency use `^`, and TypeScript uses `~`. Recommended rule: exact for `@ui-sdk/*` only (beta, already documented in CLAUDE.md), `~` for `typescript`, `^` for the rest. That means `"react": "^19.3.1"` and `"react-dom": "^19.3.1"`, as create-vite and the matching `@types` ranges do. The lockfile pins the real versions either way. Upstream pins react exactly in its catalog (`react: 19.2.3`), so keeping it exact is also defensible. Pick one and write it in CLAUDE.md.

### 9. Add a `preview` script (Low)

Add `"preview": "vite preview"` (create-vite's script set) so a built `dist/` can be checked in a browser. The skill asks for real-browser checks of popups and focus (`references/testing.md:166-170`).

### No change needed (checked)

- **`vite.config.ts` / `vitest.config.ts`: keep them separate.** Merging into one `vite.config.ts` with `test` from `vitest/config` works (simulation passed). But the authors' skill prescribes exactly this two-file `mergeConfig` layout (`references/testing.md:17-33`), and this repo follows the authors.
- **`type: "module"`, `private: true`, `version: "0.0.0"`:** correct for a private Vite app (same as create-vite).
- **Scripts** `dev`, `build` (vite only), `typecheck` (`tsc --noEmit`, the skill's form), `test` (`vitest run`), and `check` ordering: fine.
- **Lockfile:** `lockfileVersion: '9.0'`. Frozen install is up to date and the lockfile was unchanged afterwards. `pnpm dedupe --check` is clean. `pnpm audit` found no known vulnerabilities and "Lockfile passes supply-chain policies (257 entries)". `pnpm outdated` lists only `typescript`.
- **pnpm settings:** there is no `pnpm-workspace.yaml` and none is needed. pnpm 11+ reads non-auth settings only from `pnpm-workspace.yaml` (https://pnpm.io/settings). `strictDepBuilds` defaults to true and `allowBuilds` defaults to deny (https://pnpm.io/settings/build). No package in the current or proposed tree has an install script: the install succeeded under the strict default, and vite 8 uses rolldown, not esbuild. So no build approvals are needed. `minimumReleaseAge` defaults to 1440 minutes (https://pnpm.io/settings/dependency-resolution, and the effective value in `node_modules/.pnpm-workspace-state-v1.json`). oxlint 1.95.0 was published 2026-11-23T16:09Z and becomes installable 24 h later. If an install runs earlier, the non-strict default falls back to 1.94.0. Do not add `minimumReleaseAgeExclude`; the setup prompt says to stop and ask instead (`U:apps/docs/content/shared/setup-prompt/react.mdx:4`).
- **`skills-lock.json`:** keep and commit it. It pins the skill to `074ac1c` with a content hash, and that copy matches the one inside `@ui-sdk/core@0.1.0-beta.16`. When the SDK is bumped, re-run `pnpm dlx skills@latest add vercel-labs/ui --skill ui-sdk -a claude-code -y` so the skill and the package move together.

## UNCONFIRMED

- pnpm 12 (registry `latest` is 12.23.0) was not tested. Change 4 pins 11.22.0, the version that wrote the lockfile. Moving to 12 is a separate, untested decision.
- Whether `devEngines.runtime` works on pnpm 11.22: not tested, and not recommended.
- oxlint's behaviour on rules that need React Compiler settings (`react/config`, `react/gating` do not exist in oxlint 1.95.0) was not explored, because the app does not use the compiler.
