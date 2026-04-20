# Keycache

<p align="center">
  <img src="assets/demo.gif" alt="Keycache demo — open the popup, search a key, press Enter to copy the value to the clipboard" width="420" />
</p>

<p align="center">
  <strong>Key-value notes in your menu bar.</strong><br/>
  <em>One shortcut to open. Keyboard-first. Masked values for secrets.</em>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg" alt="License: GPL v3 or later" /></a>
  <a href="./.nvmrc"><img src="https://img.shields.io/badge/node-24.15.0-brightgreen" alt="Node 24.15.0" /></a>
  <img src="https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" alt="macOS, Windows, Linux" />
  <a href="https://github.com/moreiraeugenio/keycache/actions/workflows/release.yml"><img src="https://github.com/moreiraeugenio/keycache/actions/workflows/release.yml/badge.svg" alt="Release workflow status" /></a>
</p>

## ✨ Features

- 🔑 **Key-value notes** stored locally in a plain JSON file — no cloud, no accounts
- ⚡ **Global shortcut** (`⌘⇧K` / `Ctrl+Shift+K`) — open from anywhere
- ⌨️ **Keyboard-first navigation** — arrow-keys to move, Enter to copy, Escape to hide
- 🙈 **Value masking** for secrets — toggle on/off per session
- 🌓 **Themes** — system / light / dark
- 📍 **Configurable data file** location — keep your notes anywhere
- 🎹 **Customizable shortcuts** — global toggle, new note, focus search
- 🔒 **Secure-by-default Electron** — `contextIsolation: true`, `nodeIntegration: false`

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

### Cutting a release

1. Verify your local Node matches `.nvmrc` (run `nvm use` / `fnm use` if not):

   ```bash
   node --version
   ```

2. Run local sanity checks:

   ```bash
   npm ci
   npm run lint && npm run test && npm run build
   ```

3. Bump the version and tag. Pick the level per [semver](https://semver.org):

   ```bash
   npm version <patch|minor|major> -m "chore: release v%s"
   ```

   - **patch** — bugfix, no behavior change
   - **minor** — new feature, backwards-compatible
   - **major** — breaking change

   `npm version` bumps `package.json`, creates a commit with that message, and creates an annotated `v<x.y.z>` tag on that commit.

4. Push the commit and tag:

   ```bash
   git push origin main
   git push --tags
   ```

Pushing the `v*` tag triggers the workflow. Each of the three OS runners builds its native artifacts in parallel on `macos-latest` / `windows-latest` / `ubuntu-latest`; a final job collects them and creates a **draft** GitHub Release with auto-generated notes. Review the draft on the Releases page and publish manually.

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

## License

Copyright (c) 2026 Eugênio Moreira

Licensed under the **GNU General Public License v3.0 or later**. See [LICENSE](./LICENSE) for the full text.
