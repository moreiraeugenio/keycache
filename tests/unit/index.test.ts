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
  createNotesStore: vi.fn().mockImplementation(() => ({
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
  moveDataFile: vi.fn(),
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
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/main/store', () => ({
  createNotesStore: mocks.createNotesStore,
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
    dataFilePath: '',
    valuesHidden: false,
    shortcuts: {
      globalToggle: 'CmdOrCtrl+Shift+K',
      newNote: 'CmdOrCtrl+N',
      focusSearch: 'CmdOrCtrl+F',
      openSettings: 'CmdOrCtrl+,',
      toggleVisibility: 'CmdOrCtrl+Shift+H',
    },
  })),
  saveSettings: mocks.saveSettings,
  moveDataFile: mocks.moveDataFile.mockReturnValue({ ok: true }),
  getDefaultSettings: vi.fn().mockReturnValue({
    theme: 'system',
    dataFilePath: '',
    valuesHidden: false,
    shortcuts: {
      globalToggle: 'CmdOrCtrl+Shift+K',
      newNote: 'CmdOrCtrl+N',
      focusSearch: 'CmdOrCtrl+F',
      openSettings: 'CmdOrCtrl+,',
      toggleVisibility: 'CmdOrCtrl+Shift+H',
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
    delete process.env.KEYCACHE_DATA_FILE_PATH;
    delete process.env.KEYCACHE_SETTINGS_FILE_PATH;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    Object.defineProperty(process, 'platform', { value: savedPlatform, configurable: true });
  });

  // -- Path resolution --

  describe('getDataFilePath', () => {
    it('uses KEYCACHE_DATA_FILE_PATH env var when set', async () => {
      process.env.KEYCACHE_DATA_FILE_PATH = '/tmp/override.json';
      await importMain();
      expect(mocks.createNotesStore).toHaveBeenCalledWith('/tmp/override.json');
    });

    it('env var overrides settings.dataFilePath', async () => {
      process.env.KEYCACHE_DATA_FILE_PATH = '/tmp/override.json';
      mocks.loadSettings.mockReturnValueOnce({
        theme: 'system',
        dataFilePath: '/some/user/path.json',
        valuesHidden: false,
        shortcuts: {
          globalToggle: 'CmdOrCtrl+Shift+K',
          newNote: 'CmdOrCtrl+N',
          focusSearch: 'CmdOrCtrl+F',
        },
      });
      await importMain();
      expect(mocks.createNotesStore).toHaveBeenCalledWith('/tmp/override.json');
    });

    it('uses appPath with data.json in dev mode', async () => {
      await importMain();
      expect(mocks.createNotesStore).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/appPath\/data\.json$/),
      );
    });

    it('uses userData with data.json when packaged', async () => {
      mocks.isPackaged = true;
      await importMain();
      expect(mocks.createNotesStore).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/userData\/data\.json$/),
      );
    });
  });

  describe('getSettingsPath', () => {
    it('uses appPath in dev mode', async () => {
      await importMain();
      expect(mocks.loadSettings).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/appPath\/settings\.json$/),
      );
    });

    it('uses userData when packaged', async () => {
      mocks.isPackaged = true;
      await importMain();
      expect(mocks.loadSettings).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/userData\/settings\.json$/),
      );
    });

    it('uses KEYCACHE_SETTINGS_FILE_PATH env var when set', async () => {
      process.env.KEYCACHE_SETTINGS_FILE_PATH = '/tmp/custom-settings.json';
      await importMain();
      expect(mocks.loadSettings).toHaveBeenCalledWith('/tmp/custom-settings.json');
    });
  });

  // -- Initialization --

  it('loads settings and creates notes store on import', async () => {
    await importMain();
    expect(mocks.loadSettings).toHaveBeenCalledTimes(1);
    expect(mocks.createNotesStore).toHaveBeenCalledTimes(1);
    expect(mocks.registerIpc).toHaveBeenCalledTimes(1);
  });

  it('passes store holder to registerIpcHandlers', async () => {
    await importMain();
    const holder = mocks.registerIpc.mock.calls[0][0];
    expect(holder).toHaveProperty('current');
    expect(holder.current).toBe(mocks.createNotesStore.mock.results[0].value);
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

    it('sets About panel credits in dev mode', async () => {
      await importMain();
      whenReadyCb!();
      const { app: elApp } = await import('electron');
      expect(elApp.setAboutPanelOptions).toHaveBeenCalledWith(
        expect.objectContaining({ credits: expect.stringContaining('github.com') }),
      );
    });

    it('omits About panel credits when packaged (so AppKit picks up Credits.rtf)', async () => {
      mocks.isPackaged = true;
      await importMain();
      whenReadyCb!();
      const { app: elApp } = await import('electron');
      const opts = (elApp.setAboutPanelOptions as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(opts).not.toHaveProperty('credits');
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

    it('opens GitHub URL when "Check on GitHub" button is clicked on non-macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      const { dialog: elDialog, shell: elShell } = await import('electron');
      (elDialog.showMessageBox as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        response: 1,
      });
      await importMain();
      whenReadyCb!();
      const onAbout = mocks.createTray.mock.calls[0][2];
      onAbout();
      await new Promise((r) => setImmediate(r));
      expect(elShell.openExternal).toHaveBeenCalledWith(
        'https://github.com/moreiraeugenio/keycache',
      );
    });

    it('does not open GitHub URL when OK is clicked on non-macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      const { dialog: elDialog, shell: elShell } = await import('electron');
      (elDialog.showMessageBox as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        response: 0,
      });
      await importMain();
      whenReadyCb!();
      const onAbout = mocks.createTray.mock.calls[0][2];
      onAbout();
      await new Promise((r) => setImmediate(r));
      expect(elShell.openExternal).not.toHaveBeenCalled();
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
      expect(ipcHandlers['settings:browse-data-file-path']).toBeDefined();
      expect(ipcHandlers['settings:browse-existing-data-file']).toBeDefined();
    });

    it('settings:get returns effective settings with dataFilePath filled in', async () => {
      await importMain();
      whenReadyCb!();
      const result = ipcHandlers['settings:get']();
      expect(result).toHaveProperty('theme', 'system');
      expect(result).toHaveProperty('dataFilePath');
      expect((result as { dataFilePath: string }).dataFilePath).not.toBe('');
    });

    it('settings:get prefers KEYCACHE_DATA_FILE_PATH env over settings', async () => {
      process.env.KEYCACHE_DATA_FILE_PATH = '/tmp/env-override.json';
      await importMain();
      whenReadyCb!();
      const result = ipcHandlers['settings:get']() as { dataFilePath: string };
      expect(result.dataFilePath).toBe('/tmp/env-override.json');
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

  // -- settings:save --

  describe('settings:save', () => {
    const baseShortcuts = {
      globalToggle: 'CmdOrCtrl+Shift+K',
      newNote: 'CmdOrCtrl+N',
      focusSearch: 'CmdOrCtrl+F',
      openSettings: 'CmdOrCtrl+,',
      toggleVisibility: 'CmdOrCtrl+Shift+H',
    };

    function basePayload(overrides: Record<string, unknown> = {}) {
      return {
        theme: 'system' as const,
        dataFilePath: '',
        valuesHidden: false,
        shortcuts: { ...baseShortcuts },
        ...overrides,
      };
    }

    it('returns ok when nothing changes', async () => {
      await importMain();
      whenReadyCb!();
      const result = await ipcHandlers['settings:save']({}, basePayload());
      expect(result).toEqual({ ok: true });
      expect(mocks.moveDataFile).not.toHaveBeenCalled();
      expect(mocks.saveSettings).toHaveBeenCalled();
    });

    it('moves data file and re-creates store when path changes (default mode)', async () => {
      await importMain();
      whenReadyCb!();
      const initialStore = mocks.createNotesStore.mock.results[0].value;
      mocks.moveDataFile.mockReturnValueOnce({ ok: true });

      const result = await ipcHandlers['settings:save'](
        {},
        basePayload({ dataFilePath: '/tmp/new.json' }),
      );

      expect(result).toEqual({ ok: true });
      expect(mocks.moveDataFile).toHaveBeenCalledWith(expect.any(String), '/tmp/new.json');
      expect(initialStore.close).toHaveBeenCalled();
      expect(mocks.createNotesStore).toHaveBeenLastCalledWith('/tmp/new.json');
    });

    it('returns moveDataFile error and skips store swap', async () => {
      await importMain();
      whenReadyCb!();
      const initialStore = mocks.createNotesStore.mock.results[0].value;
      const initialStoreCalls = mocks.createNotesStore.mock.calls.length;
      mocks.moveDataFile.mockReturnValueOnce({ ok: false, error: 'boom' });

      const result = await ipcHandlers['settings:save'](
        {},
        basePayload({ dataFilePath: '/tmp/new.json' }),
      );

      expect(result).toEqual({ ok: false, error: 'boom' });
      expect(initialStore.close).not.toHaveBeenCalled();
      expect(mocks.createNotesStore.mock.calls.length).toBe(initialStoreCalls);
    });

    it('adopts existing file without moving when dataFileMode = adopt', async () => {
      await importMain();
      whenReadyCb!();
      const initialStore = mocks.createNotesStore.mock.results[0].value;

      const result = await ipcHandlers['settings:save'](
        {},
        basePayload({ dataFilePath: '/tmp/existing.json', dataFileMode: 'adopt' }),
      );

      expect(result).toEqual({ ok: true });
      expect(mocks.moveDataFile).not.toHaveBeenCalled();
      expect(initialStore.close).toHaveBeenCalled();
      expect(mocks.createNotesStore).toHaveBeenLastCalledWith('/tmp/existing.json');
    });

    it('does not persist dataFileMode in saved settings', async () => {
      await importMain();
      whenReadyCb!();
      mocks.moveDataFile.mockReturnValueOnce({ ok: true });

      await ipcHandlers['settings:save'](
        {},
        basePayload({ dataFilePath: '/tmp/new.json', dataFileMode: 'new' }),
      );

      const persisted = mocks.saveSettings.mock.calls.at(-1)![1] as Record<string, unknown>;
      expect(persisted).not.toHaveProperty('dataFileMode');
    });

    it('persists dataFilePath as empty when it equals the default path', async () => {
      await importMain();
      whenReadyCb!();
      const defaultPath = mocks.createNotesStore.mock.calls[0][0] as string;

      await ipcHandlers['settings:save']({}, basePayload({ dataFilePath: defaultPath }));

      const persisted = mocks.saveSettings.mock.calls.at(-1)![1] as { dataFilePath: string };
      expect(persisted.dataFilePath).toBe('');
    });

    it('re-registers global shortcut when globalToggle changes', async () => {
      await importMain();
      whenReadyCb!();
      mocks.unregisterShortcuts.mockClear();
      mocks.registerShortcuts.mockClear();

      await ipcHandlers['settings:save'](
        {},
        basePayload({ shortcuts: { ...baseShortcuts, globalToggle: 'CmdOrCtrl+Shift+J' } }),
      );

      expect(mocks.unregisterShortcuts).toHaveBeenCalled();
      expect(mocks.registerShortcuts).toHaveBeenCalledWith(
        'CmdOrCtrl+Shift+J',
        expect.any(Function),
      );
      const newToggle = mocks.registerShortcuts.mock.calls.at(-1)![1] as () => void;
      newToggle();
      expect(mocks.toggleWindow).toHaveBeenCalled();
    });

    it('emits settings:theme-changed when theme changes', async () => {
      await importMain();
      whenReadyCb!();
      mockWebContents.send.mockClear();

      await ipcHandlers['settings:save']({}, basePayload({ theme: 'dark' }));

      expect(mockWebContents.send).toHaveBeenCalledWith('settings:theme-changed', 'dark');
    });

    it('respects KEYCACHE_DATA_FILE_PATH env in getDataFilePath when persisting', async () => {
      process.env.KEYCACHE_DATA_FILE_PATH = '/tmp/env.json';
      await importMain();
      whenReadyCb!();

      await ipcHandlers['settings:save']({}, basePayload({ dataFilePath: '/tmp/env.json' }));

      const persisted = mocks.saveSettings.mock.calls.at(-1)![1] as { dataFilePath: string };
      expect(persisted.dataFilePath).toBe('');
    });

    it('emits settings:shortcuts-changed when newNote or focusSearch change', async () => {
      await importMain();
      whenReadyCb!();
      mockWebContents.send.mockClear();

      await ipcHandlers['settings:save'](
        {},
        basePayload({ shortcuts: { ...baseShortcuts, newNote: 'CmdOrCtrl+M' } }),
      );

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'settings:shortcuts-changed',
        expect.objectContaining({ newNote: 'CmdOrCtrl+M' }),
      );
    });

    it('emits settings:shortcuts-changed when openSettings changes', async () => {
      await importMain();
      whenReadyCb!();
      mockWebContents.send.mockClear();

      await ipcHandlers['settings:save'](
        {},
        basePayload({ shortcuts: { ...baseShortcuts, openSettings: 'CmdOrCtrl+.' } }),
      );

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'settings:shortcuts-changed',
        expect.objectContaining({ openSettings: 'CmdOrCtrl+.' }),
      );
    });

    it('emits settings:shortcuts-changed when toggleVisibility changes', async () => {
      await importMain();
      whenReadyCb!();
      mockWebContents.send.mockClear();

      await ipcHandlers['settings:save'](
        {},
        basePayload({
          shortcuts: { ...baseShortcuts, toggleVisibility: 'CmdOrCtrl+Shift+V' },
        }),
      );

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'settings:shortcuts-changed',
        expect.objectContaining({ toggleVisibility: 'CmdOrCtrl+Shift+V' }),
      );
    });
  });

  // -- settings:browse-data-file-path --

  describe('settings:browse-data-file-path', () => {
    it('returns selected file path', async () => {
      const { dialog: elDialog } = await import('electron');
      (elDialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        canceled: false,
        filePath: '/tmp/picked.json',
      });
      await importMain();
      whenReadyCb!();
      const result = await ipcHandlers['settings:browse-data-file-path']();
      expect(result).toBe('/tmp/picked.json');
    });

    it('returns null when canceled', async () => {
      const { dialog: elDialog } = await import('electron');
      (elDialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        canceled: true,
        filePath: '',
      });
      await importMain();
      whenReadyCb!();
      const result = await ipcHandlers['settings:browse-data-file-path']();
      expect(result).toBeNull();
    });
  });

  // -- settings:browse-existing-data-file --

  describe('settings:browse-existing-data-file', () => {
    it('returns the first selected file path', async () => {
      const { dialog: elDialog } = await import('electron');
      (elDialog.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/tmp/existing.json'],
      });
      await importMain();
      whenReadyCb!();
      const result = await ipcHandlers['settings:browse-existing-data-file']();
      expect(result).toBe('/tmp/existing.json');
    });

    it('returns null when canceled', async () => {
      const { dialog: elDialog } = await import('electron');
      (elDialog.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        canceled: true,
        filePaths: [],
      });
      await importMain();
      whenReadyCb!();
      const result = await ipcHandlers['settings:browse-existing-data-file']();
      expect(result).toBeNull();
    });

    it('returns null when no file is selected', async () => {
      const { dialog: elDialog } = await import('electron');
      (elDialog.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        canceled: false,
        filePaths: [],
      });
      await importMain();
      whenReadyCb!();
      const result = await ipcHandlers['settings:browse-existing-data-file']();
      expect(result).toBeNull();
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

    it('will-quit unregisters shortcuts and closes store', async () => {
      await importMain();
      eventHandlers['will-quit']();
      expect(mocks.unregisterShortcuts).toHaveBeenCalled();
      const store = mocks.createNotesStore.mock.results[0].value;
      expect(store.close).toHaveBeenCalled();
    });
  });
});
