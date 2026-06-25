import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { debugLog } from './debug';

let dialogOpen = false;

ipcMain.on('window:dialog-open', (_e, open: boolean) => {
  dialogOpen = open;
});

export function getAppIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(app.getAppPath(), 'build/icon.png');
}

export function createTrayWindow(showInTaskbar: boolean): BrowserWindow {
  const win = new BrowserWindow({
    width: 400,
    height: 520,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    skipTaskbar: !showInTaskbar,
    alwaysOnTop: true,
    backgroundColor: '#0f1117',
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.on('blur', () => {
    if (!win.webContents.isDevToolsOpened()) {
      hideWindow(win);
    }
  });

  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && !dialogOpen) {
      hideWindow(win);
    }
  });

  ipcMain.on('window:hide', () => hideWindow(win));

  return win;
}

export function getWindowPosition(
  win: BrowserWindow,
  trayBounds: Electron.Rectangle,
): { x: number; y: number } {
  const winBounds = win.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const workArea = display.workArea;
  const screenBounds = display.bounds;

  let x: number;
  let y: number;

  if (process.platform === 'darwin') {
    // macOS: menu bar at top — position centered below tray icon
    x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
    y = Math.round(trayBounds.y + trayBounds.height + 4);
  } else if (workArea.y > screenBounds.y) {
    // Taskbar at top
    x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
    y = workArea.y + 4;
  } else if (workArea.height < screenBounds.height) {
    // Taskbar at bottom (most common on Windows)
    x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
    y = workArea.y + workArea.height - winBounds.height - 4;
  } else {
    // Taskbar at left or right — fall back to bottom-right of work area
    x = workArea.x + workArea.width - winBounds.width - 8;
    y = workArea.y + workArea.height - winBounds.height - 8;
  }

  // Clamp to screen bounds
  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - winBounds.width));
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - winBounds.height));

  return { x, y };
}

export function showWindow(win: BrowserWindow, trayBounds: Electron.Rectangle): void {
  debugLog('window', 'show');
  const { x, y } = getWindowPosition(win, trayBounds);
  win.setPosition(x, y, false);
  if (process.platform === 'darwin') {
    app.show();
  }
  win.show();
  win.focus();
}

export function hideWindow(win: BrowserWindow): void {
  debugLog('window', 'hide');
  // win.hide() always hides the popup (works in any macOS activation policy —
  // app.hide() becomes a no-op after a runtime app.dock.show()/hide() flip).
  // On macOS we also call app.hide() so the app deactivates when it can:
  // without that, clicking the dock icon (when "Show on taskbar/dock" is on)
  // does not fire 'activate' and the popup can't be re-opened from the dock.
  win.hide();
  if (process.platform === 'darwin') {
    app.hide();
  }
}

export function toggleWindow(win: BrowserWindow, trayBounds: Electron.Rectangle): void {
  const visible = win.isVisible();
  debugLog('window', 'toggle', { visible });
  if (visible) {
    hideWindow(win);
  } else {
    showWindow(win, trayBounds);
  }
}

export function applyShowInTaskbar(win: BrowserWindow, show: boolean): void {
  debugLog('window', 'show-in-taskbar', { show });
  win.setSkipTaskbar(!show);
}
