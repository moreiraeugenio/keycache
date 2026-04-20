import { app, dialog, ipcMain, type BrowserWindow } from 'electron';
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
    return path.join(app.getPath('userData'), 'keycache.json');
  }
  return path.join(app.getAppPath(), 'keycache.json');
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
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
    async (_e, incoming: AppSettings): Promise<{ ok: boolean; error?: string }> => {
      const oldDataFilePath = effectiveDataFilePath(settings);
      const newDataFilePath = incoming.dataFilePath || getDataFilePath();

      if (newDataFilePath !== oldDataFilePath) {
        const result = moveDataFile(oldDataFilePath, newDataFilePath);
        if (!result.ok) return result;
        store.current.close();
        store.current = createNotesStore(newDataFilePath);
      }

      if (incoming.shortcuts.globalToggle !== settings.shortcuts.globalToggle) {
        unregisterShortcuts();
        registerShortcuts(incoming.shortcuts.globalToggle, () =>
          toggleWindow(win, win.getBounds()),
        );
      }

      const themeChanged = incoming.theme !== settings.theme;
      const shortcutsChanged =
        incoming.shortcuts.newNote !== settings.shortcuts.newNote ||
        incoming.shortcuts.focusSearch !== settings.shortcuts.focusSearch;

      settings = {
        ...incoming,
        dataFilePath:
          incoming.dataFilePath === getDataFilePath() ? '' : incoming.dataFilePath,
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
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  const win = createTrayWindow();

  app.setAboutPanelOptions({
    applicationName: 'Keycache',
    applicationVersion: app.getVersion(),
    version: '',
    credits: 'Built with Electron',
    copyright: `\u00A9 ${new Date().getFullYear()}`,
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
        dialog.showMessageBox(win, {
          type: 'info',
          title: 'About Keycache',
          message: `Keycache v${app.getVersion()}`,
          detail: `Built with Electron\n\u00A9 ${new Date().getFullYear()}`,
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
