import { app, dialog, ipcMain, shell, type BrowserWindow } from 'electron';
import path from 'path';
import { createNotesStore } from './store';
import { registerIpcHandlers, type NotesStoreHolder } from './ipc';
import { createTray } from './tray';
import { createTrayWindow, toggleWindow, hideWindow, showWindow } from './window';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import {
  loadSettings,
  saveSettings,
  moveDataFile,
  type AppSettings,
} from './settings';

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

const settingsPath = getSettingsPath();
let settings = loadSettings(settingsPath);

const store: NotesStoreHolder = {
  current: createNotesStore(effectiveDataFilePath(settings)),
};
registerIpcHandlers(store);

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

      if (newDataFilePath !== oldDataFilePath) {
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
        registerShortcuts(persisted.shortcuts.globalToggle, () =>
          toggleWindow(win, win.getBounds()),
        );
      }

      const themeChanged = persisted.theme !== settings.theme;
      const shortcutsChanged =
        persisted.shortcuts.newNote !== settings.shortcuts.newNote ||
        persisted.shortcuts.focusSearch !== settings.shortcuts.focusSearch;

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
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  const win = createTrayWindow();

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

  registerShortcuts(settings.shortcuts.globalToggle, () =>
    toggleWindow(win, tray.getBounds()),
  );

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
