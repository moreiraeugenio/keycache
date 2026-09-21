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

## Install

### macOS — Homebrew

```bash
brew install --cask moreiraeugenio/keycache/keycache
```

The first run shows a Gatekeeper warning (the app is unsigned — see [Unsigned caveat](#unsigned-caveat)).

### macOS / Windows / Linux — download

Grab the latest installer for your platform from [Releases](https://github.com/moreiraeugenio/keycache/releases/latest):

- macOS — `Keycache-<version>-arm64.dmg` (Apple Silicon) / `Keycache-<version>-x64.dmg` (Intel)
- Windows — `Keycache.Setup.<version>.exe`
- Linux — `Keycache-<version>.AppImage`

## Getting Started (development)

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
| `npm run package:dev` | Like `package`, but as "Keycache Dev" with appId `com.keycache.dev` (side-by-side with a prod install) |
| `npm run dist` | Build + create distributable installer to `dist/` |

## Releases

Releases are built and published via GitHub Actions (`.github/workflows/release.yml`). The workflow produces **unsigned** artifacts for macOS (`.dmg` + `.zip`), Windows (`.exe`), and Linux (`.AppImage`).

### Cutting a release

Nothing runs locally. A release is two steps, both on GitHub:

**1. Open the release PR.** Run the **Open release PR** workflow (`.github/workflows/release-pr.yml`) from the Actions tab. [release-please](https://github.com/googleapis/release-please) opens a `chore(main): release X.Y.Z` pull request carrying the `package.json` version bump and the `CHANGELOG.md` entry for every commit since the last tag. An optional `release-as` input forces a specific version instead of deriving one.

**2. Merge it.** Merging that PR *is* the release — until then nothing is tagged and nothing is published.

The merge triggers `release.yml`, which runs end to end in a single Actions run:

1. release-please tags the merge commit (`vX.Y.Z`) and creates the GitHub Release as a **draft**
2. `macos-latest` / `windows-latest` / `ubuntu-latest` build their native artifacts in parallel
3. The artifacts are attached to the release, which is then published
4. A cask-bump PR is opened against the Homebrew tap

The release is drafted rather than published up front so it is never visible without its binaries — the tag exists for the few minutes the builds take.

Because the release PR is an ordinary pull request, `ci.yml` runs against it first: lint, unit tests with coverage, build, and E2E on all three platforms. A release can only be cut from a tree that has passed all of them.

> **Commits that land after the PR is opened are not picked up.** The version and changelog freeze at dispatch time. If more work merges before you release, re-run **Open release PR** — it refreshes the existing PR in place.

### Choosing the version

The bump level comes from [Conventional Commit](https://www.conventionalcommits.org) prefixes since the last tag, mapped to [semver](https://semver.org):

- **patch** — bugfix, no behavior change (`fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `build:`, `perf:`, `style:`, `revert:`)
- **minor** — new feature, backwards-compatible (`feat:`)
- **major** — breaking change (any type with `!` like `feat!:` / `fix!:`, or a `BREAKING CHANGE:` footer)

The highest-severity match across all commits since the last tag wins. To see the level release-please picked, read the title of the open release PR — it is recomputed on every push to `main`.

#### Manual fallback

If you'd rather run the steps by hand (to pick a different bump level, skip `npm ci`, etc.):

```bash
git switch main
git pull
nvm use                                        # or `fnm use`
npm ci
npm run lint && npm run test && npm run build
npm version <patch|minor|major> -m "chore: release v%s"
git push origin main
git push --tags
```

### Manual build (no release)

Use the Actions tab's **Run workflow** button to trigger the matrix without publishing — artifacts are uploaded to the workflow run for inspection only.

### Unsigned caveat

- **macOS** users see a Gatekeeper warning on first launch; right-click the app → **Open** to bypass.
- **Windows** users see a SmartScreen warning; click **More info** → **Run anyway**.

Code signing (Apple Developer cert, Windows EV cert) is not set up; enabling it requires the certs plus additional GitHub secrets.

### Homebrew tap

After each tagged release, `.github/workflows/release.yml` opens a PR against [`moreiraeugenio/homebrew-keycache`](https://github.com/moreiraeugenio/homebrew-keycache) bumping `Casks/keycache.rb` to the new version + sha256 (per-arch). Merging that PR ships the update to `brew upgrade` users.

Requires the `HOMEBREW_TAP_TOKEN` repo secret — a PAT (classic) with `repo` scope on the tap repo, or a fine-grained token scoped to `moreiraeugenio/homebrew-keycache` with `Contents: write` + `Pull requests: write`.

## Landing page

[keycache.app](https://keycache.app) lives in [`site/`](./site) — plain HTML, CSS and one script, no framework and no build step. `.github/workflows/deploy-site.yml` deploys it to Vercel on every push to `main` that touches `site/`.

```bash
npm run site:assets   # copy demo.gif in from assets/ (gitignored under site/)
npx serve site        # preview locally (or: cd site && python3 -m http.server 8000)
npm run site:images   # re-render the OG card and favicon after editing them
```

See [`site/README.md`](./site/README.md) for the Vercel project setup and the required secrets.

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
