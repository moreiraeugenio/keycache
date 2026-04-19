import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Shared mock state ---
const mockHide = vi.fn();
const mockPreventDefault = vi.fn();

const eventHandlers: Record<string, (...args: unknown[]) => unknown> = {};
const winEventHandlers: Record<string, (...args: unknown[]) => unknown> = {};
const ipcHandlers: Record<string, (...args: unknown[]) => unknown> = {};
let whenReadyCb: (() => void) | null = null;

const mockWebContents = { send: vi.fn() };
const mockWin = {
  on: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => unknown) => {
    winEventHandlers[event] = handler;
  }),
  hide: mockHide,
  getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 400, height: 520 }),
  webContents: mockWebContents,
};

const mockTray = {
  getBounds: vi.fn().mockReturnValue({ x: 100, y: 0, width: 24, height: 24 }),
};

const mocks = vi.hoisted(() => ({
  isPackaged: false,
  createDatabase: vi.fn().mockImplementation(() => ({
    getNotes: vi.fn(),
    addNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    close: vi.fn(),
  })),
  registerIpc: vi.fn(),
  createTrayWindow: vi.fn(),
  toggleWindow: vi.fn(),
  hideWindow: vi.fn(),
  showWindow: vi.fn(),
  createTray: vi.fn(),
  registerShortcuts: vi.fn(),
  unregisterShortcuts: vi.fn(),
  dockHide: vi.fn(),
  quit: vi.fn(),
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  moveDbFile: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return mocks.isPackaged;
    },
    getPath: vi.fn().mockReturnValue('/mock/userData'),
    getAppPath: vi.fn().mockReturnValue('/mock/appPath'),
    whenReady: vi.fn().mockReturnValue({
      then: (cb: () => void) => {
        whenReadyCb = cb;
      },
    }),
    on: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => unknown) => {
      eventHandlers[event] = handler;
    }),
    quit: mocks.quit,
    dock: { hide: mocks.dockHide },
    getVersion: vi.fn().mockReturnValue('2.0.0'),
    setAboutPanelOptions: vi.fn(),
    showAboutPanel: vi.fn(),
  },
  BrowserWindow: class {},
  ipcMain: {
    handle: vi
      .fn()
      .mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
        ipcHandlers[channel] = handler;
      }),
  },
  dialog: {
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: true, filePath: '' }),
    showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
  },
}));

vi.mock('../../src/main/db', () => ({
  createDatabase: mocks.createDatabase,
}));

vi.mock('../../src/main/ipc', () => ({
  registerIpcHandlers: mocks.registerIpc,
}));

vi.mock('../../src/main/window', () => ({
  createTrayWindow: mocks.createTrayWindow.mockReturnValue(mockWin),
  toggleWindow: mocks.toggleWindow,
  hideWindow: mocks.hideWindow,
  showWindow: mocks.showWindow,
}));

vi.mock('../../src/main/tray', () => ({
  createTray: mocks.createTray.mockReturnValue(mockTray),
}));

vi.mock('../../src/main/shortcuts', () => ({
  registerShortcuts: mocks.registerShortcuts,
  unregisterShortcuts: mocks.unregisterShortcuts,
}));

vi.mock('../../src/main/settings', () => ({
  loadSettings: mocks.loadSettings.mockImplementation(() => ({
    theme: 'system',
    dbPath: '',
    shortcuts: {
      globalToggle: 'CmdOrCtrl+Shift+K',
      newNote: 'CmdOrCtrl+N',
      focusSearch: 'CmdOrCtrl+F',
    },
  })),
  saveSettings: mocks.saveSettings,
  moveDbFile: mocks.moveDbFile.mockReturnValue({ ok: true }),
  getDefaultSettings: vi.fn().mockReturnValue({
    theme: 'system',
    dbPath: '',
    shortcuts: {
      globalToggle: 'CmdOrCtrl+Shift+K',
      newNote: 'CmdOrCtrl+N',
      focusSearch: 'CmdOrCtrl+F',
    },
  }),
}));

// --- Helpers ---
const savedEnv = { ...process.env };
const savedPlatform = process.platform;

async function importMain() {
  await import('../../src/main/index');
}

describe('main process (index.ts)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.isPackaged = false;
    whenReadyCb = null;
    Object.keys(eventHandlers).forEach((k) => delete eventHandlers[k]);
    Object.keys(winEventHandlers).forEach((k) => delete winEventHandlers[k]);
    Object.keys(ipcHandlers).forEach((k) => delete ipcHandlers[k]);
    delete process.env.KEYCACHE_DB_PATH;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    Object.defineProperty(process, 'platform', { value: savedPlatform, configurable: true });
  });

  // -- Path resolution --

  describe('getDbPath', () => {
    it('uses KEYCACHE_DB_PATH env var when set', async () => {
      process.env.KEYCACHE_DB_PATH = '/tmp/override.json';
      await importMain();
      expect(mocks.createDatabase).toHaveBeenCalledWith('/tmp/override.json');
    });

    it('uses appPath in dev mode', async () => {
      await importMain();
      expect(mocks.createDatabase).toHaveBeenCalledWith(
        expect.stringContaining('/mock/appPath'),
      );
    });

    it('uses userData when packaged', async () => {
      mocks.isPackaged = true;
      await importMain();
      expect(mocks.createDatabase).toHaveBeenCalledWith(
        expect.stringContaining('/mock/userData'),
      );
    });
  });

  // -- Initialization --

  it('loads settings and creates database on import', async () => {
    await importMain();
    expect(mocks.loadSettings).toHaveBeenCalledTimes(1);
    expect(mocks.createDatabase).toHaveBeenCalledTimes(1);
    expect(mocks.registerIpc).toHaveBeenCalledTimes(1);
  });

  it('passes db holder to registerIpcHandlers', async () => {
    await importMain();
    const holder = mocks.registerIpc.mock.calls[0][0];
    expect(holder).toHaveProperty('current');
    expect(holder.current).toBe(mocks.createDatabase.mock.results[0].value);
  });

  // -- whenReady --

  describe('app.whenReady', () => {
    it('hides dock on macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      await importMain();
      whenReadyCb!();
      expect(mocks.dockHide).toHaveBeenCalled();
    });

    it('does not hide dock on non-macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      await importMain();
      whenReadyCb!();
      expect(mocks.dockHide).not.toHaveBeenCalled();
    });

    it('creates tray window', async () => {
      await importMain();
      whenReadyCb!();
      expect(mocks.createTrayWindow).toHaveBeenCalled();
    });

    it('creates tray with toggle, settings, about, and quit callbacks', async () => {
      await importMain();
      whenReadyCb!();
      expect(mocks.createTray).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('tray toggle callback calls toggleWindow', async () => {
      await importMain();
      whenReadyCb!();
      const onToggle = mocks.createTray.mock.calls[0][0];
      const bounds = { x: 50, y: 0, width: 24, height: 24 };
      onToggle(bounds);
      expect(mocks.toggleWindow).toHaveBeenCalledWith(mockWin, bounds);
    });

    it('tray settings callback shows window and sends settings:open', async () => {
      await importMain();
      whenReadyCb!();
      const onSettings = mocks.createTray.mock.calls[0][1];
      onSettings();
      expect(mocks.showWindow).toHaveBeenCalledWith(mockWin, {
        x: 100,
        y: 0,
        width: 24,
        height: 24,
      });
      expect(mockWebContents.send).toHaveBeenCalledWith('settings:open');
    });

    it('tray about callback shows about panel on macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      await importMain();
      whenReadyCb!();
      const { app: elApp } = await import('electron');
      const onAbout = mocks.createTray.mock.calls[0][2];
      onAbout();
      expect(elApp.showAboutPanel).toHaveBeenCalled();
    });

    it('tray about callback shows message box on non-macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      await importMain();
      whenReadyCb!();
      const { dialog: elDialog } = await import('electron');
      const onAbout = mocks.createTray.mock.calls[0][2];
      onAbout();
      expect(elDialog.showMessageBox).toHaveBeenCalledWith(
        mockWin,
        expect.objectContaining({ type: 'info', title: 'About Keycache' }),
      );
    });

    it('tray quit callback calls app.quit', async () => {
      await importMain();
      whenReadyCb!();
      const onQuit = mocks.createTray.mock.calls[0][3];
      onQuit();
      expect(mocks.quit).toHaveBeenCalled();
    });

    it('registers global shortcuts with accelerator from settings', async () => {
      await importMain();
      whenReadyCb!();
      expect(mocks.registerShortcuts).toHaveBeenCalledWith(
        'CmdOrCtrl+Shift+K',
        expect.any(Function),
      );

      const shortcutToggle = mocks.registerShortcuts.mock.calls[0][1];
      shortcutToggle();
      expect(mocks.toggleWindow).toHaveBeenCalledWith(mockWin, {
        x: 100,
        y: 0,
        width: 24,
        height: 24,
      });
    });

    it('registers settings IPC handlers', async () => {
      await importMain();
      whenReadyCb!();
      expect(ipcHandlers['settings:get']).toBeDefined();
      expect(ipcHandlers['settings:save']).toBeDefined();
      expect(ipcHandlers['settings:browse-db-path']).toBeDefined();
    });

    it('settings:get returns effective settings with dbPath filled in', async () => {
      await importMain();
      whenReadyCb!();
      const result = ipcHandlers['settings:get']();
      expect(result).toHaveProperty('theme', 'system');
      expect(result).toHaveProperty('dbPath');
      expect((result as { dbPath: string }).dbPath).not.toBe('');
    });

    it('intercepts window close to hide instead of destroy', async () => {
      await importMain();
      whenReadyCb!();
      expect(winEventHandlers['close']).toBeDefined();

      const event = { preventDefault: mockPreventDefault };
      winEventHandlers['close'](event);
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mocks.hideWindow).toHaveBeenCalledWith(mockWin);
    });

    it('allows window close when app is quitting', async () => {
      await importMain();
      whenReadyCb!();

      eventHandlers['before-quit']();

      const event = { preventDefault: mockPreventDefault };
      winEventHandlers['close'](event);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mocks.hideWindow).not.toHaveBeenCalled();
    });
  });

  // -- Lifecycle --

  describe('lifecycle events', () => {
    it('window-all-closed does nothing (tray keeps app alive)', async () => {
      await importMain();
      eventHandlers['window-all-closed']();
      expect(mocks.quit).not.toHaveBeenCalled();
    });

    it('before-quit sets isQuitting flag', async () => {
      await importMain();
      whenReadyCb!();
      eventHandlers['before-quit']();

      const event = { preventDefault: mockPreventDefault };
      winEventHandlers['close'](event);
      expect(mockPreventDefault).not.toHaveBeenCalled();
    });

    it('will-quit unregisters shortcuts and closes db', async () => {
      await importMain();
      eventHandlers['will-quit']();
      expect(mocks.unregisterShortcuts).toHaveBeenCalled();
      const db = mocks.createDatabase.mock.results[0].value;
      expect(db.close).toHaveBeenCalled();
    });
  });
});
