# Keycache

A system tray desktop app for storing key-value notes in a local JSON file. Lives in the menu bar with a global shortcut, keyboard-first navigation, value masking for secrets, a configurable database location, user-customizable shortcuts, and system/light/dark themes.

## Tech Stack

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
