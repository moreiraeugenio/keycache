import { app, dialog, ipcMain, shell, type BrowserWindow } from 'electron';
import path from 'path';
import { createNotesStore } from './store';
import { registerIpcHandlers, type NotesStoreHolder } from './ipc';
import { createTray } from './tray';
import {
  createTrayWindow,
  toggleWindow,
  hideWindow,
  showWindow,
  getAppIconPath,
  applyShowInTaskbar,
} from './window';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import {
  loadSettings,
  saveSettings,
  moveDataFile,
  type AppSettings,
} from './settings';
import { debugLog, registerDebugIpc } from './debug';

function getDataFilePath(): string {
  if (process.env.KEYCACHE_DATA_FILE_PATH) {
    return process.env.KEYCACHE_DATA_FILE_PATH;
  }
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'data.json');
  }
  return path.join(app.getAppPath(), 'data.json');
}

function getSettingsPath(): string {
  if (process.env.KEYCACHE_SETTINGS_FILE_PATH) {
    return process.env.KEYCACHE_SETTINGS_FILE_PATH;
  }
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'settings.json');
  }
  return path.join(app.getAppPath(), 'settings.json');
}

function effectiveDataFilePath(settings: AppSettings): string {
  if (process.env.KEYCACHE_DATA_FILE_PATH) return process.env.KEYCACHE_DATA_FILE_PATH;
  return settings.dataFilePath || getDataFilePath();
}

const LAUNCH_ACTIVATION_SKIP_MS = 2000;

const settingsPath = getSettingsPath();
let settings = loadSettings(settingsPath);

// Hide the dock icon as early as possible so it never appears when Keycache is
// launched at login with showInTaskbar off. Deferring this to whenReady lets
// macOS activate the app as a foreground GUI process first and leaves the dock
// entry in place. See issue #32.
if (process.platform === 'darwin' && !settings.showInTaskbar) {
  app.dock?.hide();
}

const store: NotesStoreHolder = {
  current: createNotesStore(effectiveDataFilePath(settings)),
};
registerIpcHandlers(store);
registerDebugIpc();

let isQuitting = false;

function registerSettingsIpc(win: BrowserWindow): void {
  ipcMain.handle('settings:get', () => ({
    ...settings,
    dataFilePath: effectiveDataFilePath(settings),
  }));

  ipcMain.handle(
    'settings:save',
    async (
      _e,
      incoming: AppSettings & { dataFileMode?: 'new' | 'adopt' },
    ): Promise<{ ok: boolean; error?: string }> => {
      const oldDataFilePath = effectiveDataFilePath(settings);
      const newDataFilePath = incoming.dataFilePath || getDataFilePath();
      const { dataFileMode, ...persisted } = incoming;
      const dataFilePathChanged = newDataFilePath !== oldDataFilePath;

      if (dataFilePathChanged) {
        if (dataFileMode === 'adopt') {
          store.current.close();
          store.current = createNotesStore(newDataFilePath);
        } else {
          const result = moveDataFile(oldDataFilePath, newDataFilePath);
          if (!result.ok) return result;
          store.current.close();
          store.current = createNotesStore(newDataFilePath);
        }
      }

      if (persisted.shortcuts.globalToggle !== settings.shortcuts.globalToggle) {
        unregisterShortcuts();
        registerShortcuts(persisted.shortcuts.globalToggle, () => {
          debugLog('global-shortcut', 'toggle');
          toggleWindow(win, win.getBounds());
        });
      }

      const themeChanged = persisted.theme !== settings.theme;
      const shortcutsChanged =
        persisted.shortcuts.newNote !== settings.shortcuts.newNote ||
        persisted.shortcuts.focusSearch !== settings.shortcuts.focusSearch ||
        persisted.shortcuts.openSettings !== settings.shortcuts.openSettings ||
        persisted.shortcuts.toggleVisibility !== settings.shortcuts.toggleVisibility;
      const startAtLoginChanged = persisted.startAtLogin !== settings.startAtLogin;
      const showInTaskbarChanged = persisted.showInTaskbar !== settings.showInTaskbar;

      settings = {
        ...persisted,
        dataFilePath:
          persisted.dataFilePath === getDataFilePath() ? '' : persisted.dataFilePath,
      };
      saveSettings(settingsPath, settings);

      if (themeChanged) {
        win.webContents.send('settings:theme-changed', settings.theme);
      }
      if (shortcutsChanged) {
        win.webContents.send('settings:shortcuts-changed', settings.shortcuts);
      }
      if (dataFilePathChanged) {
        win.webContents.send('settings:data-file-changed');
      }
      if (startAtLoginChanged) {
        app.setLoginItemSettings({
          openAtLogin: settings.startAtLogin,
          openAsHidden: true,
        });
      }
      if (showInTaskbarChanged) {
        applyShowInTaskbar(win, settings.showInTaskbar);
        if (process.platform === 'darwin') {
          if (settings.showInTaskbar) {
            app.dock.show();
          } else {
            app.dock.hide();
          }
        }
      }

      return { ok: true };
    },
  );

  ipcMain.handle('settings:browse-data-file-path', async () => {
    const result = await dialog.showSaveDialog(win, {
      title: 'Choose data file location',
      defaultPath: effectiveDataFilePath(settings),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    return result.canceled ? null : result.filePath;
  });

  ipcMain.handle('settings:browse-existing-data-file', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Open existing data file',
      defaultPath: effectiveDataFilePath(settings),
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });
}

app.whenReady().then(() => {
  const win = createTrayWindow(settings.showInTaskbar);

  app.setAboutPanelOptions({
    applicationName: 'Keycache',
    applicationVersion: `Version ${app.getVersion()}`,
    version: '',
    copyright: '\u00A9 2026 Eugênio Moreira',
    ...(app.isPackaged
      ? {}
      : { credits: 'Check on GitHub \u00B7 github.com/moreiraeugenio/keycache' }),
  });

  const tray = createTray(
    (bounds) => toggleWindow(win, bounds),
    () => {
      showWindow(win, tray.getBounds());
      win.webContents.send('settings:open');
    },
    () => {
      if (process.platform === 'darwin') {
        app.showAboutPanel();
      } else {
        dialog
          .showMessageBox(win, {
            type: 'info',
            title: 'About Keycache',
            message: `Keycache Version ${app.getVersion()}`,
            detail: '\u00A9 2026 Eugênio Moreira',
            icon: getAppIconPath(),
            buttons: ['OK', 'Check on GitHub'],
            defaultId: 0,
            cancelId: 0,
          })
          .then(({ response }) => {
            if (response === 1) {
              shell.openExternal('https://github.com/moreiraeugenio/keycache');
            }
          });
      }
    },
    () => app.quit(),
  );

  registerShortcuts(settings.shortcuts.globalToggle, () => {
    debugLog('global-shortcut', 'toggle');
    toggleWindow(win, tray.getBounds());
  });

  app.on('activate', () => {
    debugLog('app', 'activate');
    showWindow(win, tray.getBounds());
  });

  const launchedAt = Date.now();
  app.on('did-become-active', () => {
    if (Date.now() - launchedAt < LAUNCH_ACTIVATION_SKIP_MS) {
      debugLog('app', 'did-become-active-skipped-launch');
      return;
    }
    debugLog('app', 'did-become-active');
    showWindow(win, tray.getBounds());
  });

  app.setLoginItemSettings({
    openAtLogin: settings.startAtLogin,
    openAsHidden: true,
  });

  registerSettingsIpc(win);

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      hideWindow(win);
    }
  });
});

app.on('window-all-closed', () => {
  // No-op — tray keeps the app alive
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  unregisterShortcuts();
  store.current.close();
});
