# Keycache

A system tray desktop app for storing key-value notes in a local JSON file. Lives in the menu bar with a global shortcut, keyboard-first navigation, value masking for secrets, a configurable data file location, user-customizable shortcuts, and system/light/dark themes.

## Tech Stack

- **Node.js 24.15.0** — pinned via `.nvmrc` (read by nvm/fnm/asdf/volta) and enforced softly by `engines.node` in `package.json`
- **Electron 40** — desktop shell with secure IPC (`contextIsolation: true`, `nodeIntegration: false`)
- **TypeScript** — across main, preload, and renderer
- **electron-vite** — dev server with HMR and production build
- **Vitest** — unit tests with V8 coverage (100% threshold on main process)
- **Playwright** — E2E tests driving a packaged Electron build
- **electron-builder** — packaging and installers
- **ESLint + Prettier** — linting and formatting
- **JSON file storage** — no native dependencies; notes persisted to a plain JSON file

## Getting Started

```bash
nvm use        # or `fnm use` — activates the Node version pinned in .nvmrc
npm install
npm run dev
```

The window starts hidden — look for the Keycache icon in the menu bar / system tray, or press the default global shortcut `⌘⇧K` (macOS) / `Ctrl+Shift+K` (Windows, Linux) to toggle it.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Launch dev server with HMR |
| `npm run start` | Alias for `dev` |
| `npm run build` | Production build to `out/` |
| `npm run preview` | Preview the production build (`electron-vite preview`) |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with coverage report |
| `npm run test:e2e` | Build + run Playwright E2E tests |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |
| `npm run package` | Build + package unpacked app to `dist/` |
| `npm run dist` | Build + create distributable installer to `dist/` |

## Releases

Releases are built and published via GitHub Actions (`.github/workflows/release.yml`). The workflow produces **unsigned** artifacts for macOS (`.dmg` + `.zip`), Windows (`.exe`), and Linux (`.AppImage`).

### Cutting the first release

`package.json` starts at `0.0.0` (nothing has shipped yet). The first release will be **`v0.0.1`**:

```bash
node --version                                # must match .nvmrc (24.15.0)
npm ci && npm run lint && npm run test && npm run build
npm version patch -m "chore: release v%s"    # 0.0.0 → 0.0.1, commits, tags v0.0.1
git push origin main
git push --tags
```

Pushing the `v0.0.1` tag triggers the workflow. Each of the three OS runners builds its native artifacts in parallel on `macos-latest` / `windows-latest` / `ubuntu-latest`; a final job collects them and creates a **draft** GitHub Release with auto-generated notes. Review the draft on the Releases page and publish manually.

### Subsequent releases

Same flow, different bump level:

- **Patch** (bugfix): `npm version patch` → `0.0.2`
- **Minor** (first feature milestone or later): `npm version minor` → `0.1.0`
- **Major** (breaking change or first stable release): `npm version major` → `1.0.0`

### Manual build (no release)

Use the Actions tab's **Run workflow** button to trigger the matrix without publishing — artifacts are uploaded to the workflow run for inspection only.

### Unsigned caveat

- **macOS** users see a Gatekeeper warning on first launch; right-click the app → **Open** to bypass.
- **Windows** users see a SmartScreen warning; click **More info** → **Run anyway**.
- macOS default target is the runner's arch only (arm64 on `macos-latest`). For x64 or universal builds, extend `mac.target` / `arch` in `electron-builder.yml`.

Code signing (Apple Developer cert, Windows EV cert) is not set up; enabling it requires the certs plus additional GitHub secrets.

## Contributing

### Commit Message Template

A properly formed Git commit subject line should always be able to complete the following sentence:

**If applied, this commit will `your subject line here`**

#### Example

`[type](optional scope): [subject]`

#### Type

Must be one of the following:

- build - build related changes
- ci - CI related changes
- chore - build process or auxiliary tool changes
- docs - documentation only changes
- feat - a new feature
- fix - a bug fix
- perf - a code change that improves performance
- refactor - a code change that neither fixes a bug nor adds a feature
- revert - reverting things
- style - markup, white-space, formatting, missing semicolons, etc
- test - adding missing tests

#### Subject

The subject contains a succinct description of the change:

- Use the imperative, present tense: "change" not "changed" nor "changes"
- No dot (.) at the end

#### Body

Just as in the subject, use the imperative, present tense: "change", not "changed" nor "changes". The body should include the motivation for the change and contrast this with previous behavior.

#### Rules

The 7 rules of a great commit message:

1. Separate subject from body with a blank line
2. Limit the subject line to 50 characters
3. Summary in present tense. Not capitalized
4. Do not end the subject line with a period
5. Use the imperative mood in the subject line
6. Wrap the body at 72 characters
7. Use the body to explain what and why vs. how
