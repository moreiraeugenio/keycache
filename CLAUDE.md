# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node.js **24.15.0** is pinned via `.nvmrc` (and softly enforced by `engines.node` in `package.json`). Run `nvm use` (or `fnm use`) before the commands below if your shell isn't already on the right version.

```bash
npm install                # install dependencies
npm run dev                # launch dev server with HMR (electron-vite dev)
npm run build              # production build to out/ (electron-vite build)
npm run lint               # ESLint on src/
npm run format             # Prettier on src/
npm run test               # unit tests (Vitest)
npm run test:e2e           # E2E tests (Playwright + Electron) — builds app, then runs
npm run package            # build + package unpacked app to dist/
npm run dist               # build + create distributable installer to dist/
npm run version:preview    # show bump level picked from commits since last tag (dry run)
npm run version:auto       # bump package.json + tag based on commits since last tag
npm run release            # full release flow: sync, checks, bump, push (one command)
npm run release:dry-run    # run all checks and preview, stop before bump + push
```

## Architecture

System tray desktop app for storing key-value notes in a local JSON file. TypeScript throughout, built with electron-vite. Lives in the menu bar (macOS) / notification area (Windows) / system tray (Linux). No native dependencies.

Follows Electron security best practices: `contextIsolation: true`, `nodeIntegration: false`, all data access via IPC in the main process.

```
src/
  main/
    index.ts          # App lifecycle, storage + settings init, tray/window/shortcut orchestration, settings IPC
    window.ts         # Frameless popup window: creation, positioning near tray, show/hide/toggle, blur + Escape auto-hide
    tray.ts           # System tray icon + context menu (Settings / About / Quit)
    shortcuts.ts      # Global shortcut registration (accelerator from settings)
    store.ts          # JSON file storage: in-memory notes with file persistence, NotesStore interface
    ipc.ts            # Notes IPC handlers (delegates to NotesStoreHolder.current — swappable)
    settings.ts       # AppSettings type, load/save (atomic .tmp+rename), moveDataFile (EXDEV-safe), defaults
  preload/
    index.ts          # contextBridge → window.api (notes, settings, dialog-open, hide, change subscriptions)
  renderer/
    index.html        # Single page with form / confirm / settings dialogs
    renderer.ts       # Orchestrator: list render, add/edit form, delete confirm, toast, search (debounced), value masking
    settings-dialog.ts  # Settings modal: theme, data file path browse, shortcut recorder, accelerator formatting
    shortcuts.ts      # In-window keyboard layer: ↑/↓ nav, Enter copy+hide, Escape, rebindable newNote / focusSearch
    styles.css        # Glassmorphism themes (dark + light via data-theme)
    env.d.ts          # Note / AppSettings / KeycacheApi type declarations
resources/
  trayIconTemplate.png      # macOS tray icon (22x22, template)
  trayIconTemplate@2x.png   # macOS retina (44x44)
  tray-icon.png             # Linux tray icon (256x256)
  tray-icon.ico             # Windows tray icon
tests/
  unit/                     # Vitest — 100% coverage enforced on src/main
    store.test.ts           # JSON storage CRUD + persistence tests
    ipc.test.ts             # IPC handler delegation tests (including NotesStoreHolder swap)
    index.test.ts           # App lifecycle + path resolution + settings IPC tests
    window.test.ts          # Window positioning + show/hide + blur + Escape tests
    tray.test.ts            # Tray icon path + context menu tests
    shortcuts.test.ts       # Global shortcut registration tests
    settings.test.ts        # loadSettings / saveSettings / moveDataFile tests
  e2e/
    app.test.ts             # Playwright — critical user flows
```

**Build output:** `out/` (electron-vite build) → `dist/` (electron-builder packaged app)

## Key Details

- **Storage:** Notes stored as JSON file (default `data.json`). All CRUD operates in-memory; file is written on every mutation. `createNotesStore(filePath)` returns a `NotesStore` interface. Handles missing/corrupted files gracefully (starts empty). The `NotesStoreHolder.current` reference in `ipc.ts` is swapped — not re-registered — when the user changes the data file path at runtime.
- **Settings:** Persisted next to the data file: `app.getAppPath()/settings.json` in dev, `app.getPath('userData')/settings.json` when packaged. `AppSettings` = `{ theme, dataFilePath, valuesHidden, shortcuts: { globalToggle, newNote, focusSearch } }`. Atomic write (`.tmp` + `rename`). `loadSettings` merges partial/corrupted files with defaults. `moveDataFile` prefers `rename`, falls back to `copyFileSync` + `unlinkSync` on cross-device errors (`EXDEV`).
- **Tray app pattern:** Window starts hidden (`show: false`), `skipTaskbar: true`. Clicking the tray icon or pressing the configured global shortcut toggles the popup. Window auto-hides on blur (unless DevTools are open) and on Escape (via `webContents.on('before-input-event')`) unless a `<dialog>` modal is open (coordinated via `window:dialog-open` IPC). Clicking away while a dialog is open hides the window; the dialog state is preserved and is visible again when the popup is re-opened.
- **Tray menu:** Right-click shows `Settings / — / About Keycache / Quit Keycache`. Settings shows the window and sends `settings:open` to the renderer. About calls `app.showAboutPanel()` on macOS, `dialog.showMessageBox()` elsewhere (panel configured via `app.setAboutPanelOptions`).
- **IPC channels:**
  - Main `ipcMain.handle`: `notes:getAll`, `notes:add`, `notes:update`, `notes:delete`, `settings:get`, `settings:save`, `settings:browse-data-file-path`.
  - Main `ipcMain.on`: `window:dialog-open`, `window:hide`.
  - Main → renderer `webContents.send`: `settings:theme-changed`, `settings:shortcuts-changed`, `settings:open`.
- **Keyboard UX:** Arrow ↑/↓ in the search input navigates the filtered list; Enter copies the selected value to clipboard and hides the window. Escape closes whichever dialog is open (confirm > form). Tab is swallowed outside dialogs (to keep focus on search). `newNote` / `focusSearch` bindings live-update on save via `updateKeyBindings`.
- **Theming:** Renderer sets `data-theme="light" | "dark"` on `<html>`. In `system` mode it resolves from `matchMedia('(prefers-color-scheme: dark)')` and listens for changes. Theme applied on startup and whenever main broadcasts `settings:theme-changed`.
- **Value masking:** Per-user "hide all values" toggle. Persisted in `settings.json` as `valuesHidden`. Masked values render as `••••••••` with a `.masked` class.
- **Paste sanitization:** Pasting multi-line text into the value textarea collapses `\r\n|\r|\n` runs to single spaces, preserving selection range.
- **Window positioning:** `getWindowPosition()` in `window.ts` handles macOS (below menu bar), Windows (above bottom taskbar or below top taskbar), Linux (bottom-right fallback), with screen edge clamping.
- **Platform handling:** macOS: `app.dock.hide()`, template icon for auto dark/light. Windows: `.ico` icon, `skipTaskbar: true`. Linux: `.png` icon.
- **Close intercept:** Window `close` event is intercepted with `preventDefault()` + `hide()`. Only `app.quit()` (from tray menu or `before-quit` flag) actually closes. `will-quit` unregisters shortcuts and closes the notes store.
- **Production paths:** Data and settings JSON files at `app.getPath('userData')` when packaged (data file overridable via `settings.dataFilePath` or `KEYCACHE_DATA_FILE_PATH`), `app.getAppPath()` (repo root) in dev. Tray icons at `process.resourcesPath` when packaged (via `extraResources` in `electron-builder.yml`).
- **Test isolation:** E2E tests set `KEYCACHE_DATA_FILE_PATH` env var to a temp file per test. Main process respects this override and it takes precedence over `settings.dataFilePath`.
- **Coverage:** 100% unit coverage enforced via thresholds in `vitest.config.ts` (scoped to `src/main`).
- **Release pipeline:** `.github/workflows/release.yml` builds unsigned artifacts for mac/win/linux. Trigger: push a `v*` tag (`npm version <level>` + `git push --tags`) or run workflow manually. Each runner runs `npm run dist` with `CSC_IDENTITY_AUTO_DISCOVERY=false` and uploads its artifacts; a final `release` job downloads all and publishes a GitHub Release with auto-generated notes (public immediately, no draft step). Node pinned via `.nvmrc` — `setup-node` reads it in CI, and nvm/fnm/asdf read it locally. `package.json` version is the source of truth (stamped into artifact filenames by electron-builder); `npm version <level>` keeps it and the git tag in sync. `scripts/version-bump.mjs` (exposed as `npm run version:preview` / `npm run version:auto`) classifies each commit since the last tag from its Conventional Commit prefix — `feat!`/`fix!`/`BREAKING CHANGE:` → major, `feat:` → minor, everything else → patch — and runs `npm version <level>` with the highest-severity match. `scripts/release.mjs` (exposed as `npm run release`) drives the whole release: branch-must-be-main, clean-tree, fast-forward with `origin/main`, Node matches `.nvmrc`, `npm ci`, lint/test/build, bump preview, single `[y/N]` confirmation, then `npm version <level>` + `git push origin main` + `git push --tags`. Aborts on any failed guard. `--dry-run` (`npm run release:dry-run`) runs every check and the preview but stops before the bump. Signing not configured.

## Commit Messages

When asked to produce a commit message, follow the convention documented in `README.md` under **Contributing → Commit Message Template**:

- **Format:** `type(optional scope): subject` — e.g. `fix: allow changing data file path before first note`.
- **Type:** one of `build`, `ci`, `chore`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.
- **Subject:** imperative present tense — the line must complete "If applied, this commit will ___". Lowercase first word, no trailing period, ≤50 characters.
- **Body (when useful):** separated from subject by a blank line, wrapped at 72 characters, imperative mood, explaining *what* and *why* — not *how*.
