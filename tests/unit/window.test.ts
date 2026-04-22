import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockShow = vi.fn();
const mockHide = vi.fn();
const mockFocus = vi.fn();
const mockSetPosition = vi.fn();
const mockIsVisible = vi.fn().mockReturnValue(false);
const mockGetBounds = vi.fn().mockReturnValue({ x: 0, y: 0, width: 400, height: 520 });
const mockIsDevToolsOpened = vi.fn().mockReturnValue(false);
const mockLoadURL = vi.fn();
const mockLoadFile = vi.fn();
const appMocks = vi.hoisted(() => ({
  hide: vi.fn(),
  show: vi.fn(),
}));
const mockAppHide = appMocks.hide;
const mockAppShow = appMocks.show;

type BeforeInputHandler = (
  event: { preventDefault: () => void },
  input: { type: string; key: string },
) => void;

let blurHandler: (() => void) | null = null;
let beforeInputHandler: BeforeInputHandler | null = null;

const mockWinOn = vi.fn().mockImplementation((event: string, handler: () => void) => {
  if (event === 'blur') blurHandler = handler;
});

const mockWebContentsOn = vi
  .fn()
  .mockImplementation((event: string, handler: BeforeInputHandler) => {
    if (event === 'before-input-event') beforeInputHandler = handler;
  });

const mocks = vi.hoisted(() => ({
  bwConstructorArgs: null as unknown,
  ipcHandlers: {} as Record<string, (...args: unknown[]) => void>,
  debugLog: vi.fn(),
}));

vi.mock('../../src/main/debug', () => ({
  debugLog: mocks.debugLog,
  registerDebugIpc: vi.fn(),
}));

vi.mock('electron', () => ({
  BrowserWindow: class MockBrowserWindow {
    show = mockShow;
    hide = mockHide;
    focus = mockFocus;
    setPosition = mockSetPosition;
    isVisible = mockIsVisible;
    getBounds = mockGetBounds;
    loadURL = mockLoadURL;
    loadFile = mockLoadFile;
    on = mockWinOn;
    webContents = { isDevToolsOpened: mockIsDevToolsOpened, on: mockWebContentsOn };
    constructor(opts: unknown) {
      mocks.bwConstructorArgs = opts;
    }
  },
  ipcMain: {
    on: vi.fn().mockImplementation((channel: string, handler: (...args: unknown[]) => void) => {
      mocks.ipcHandlers[channel] = handler;
    }),
  },
  screen: {
    getDisplayNearestPoint: vi.fn().mockReturnValue({
      workArea: { x: 0, y: 25, width: 1440, height: 875 },
      bounds: { x: 0, y: 0, width: 1440, height: 900 },
    }),
  },
  app: appMocks,
}));

import { screen } from 'electron';
import {
  createTrayWindow,
  getWindowPosition,
  showWindow,
  hideWindow,
  toggleWindow,
} from '../../src/main/window';

describe('window', () => {
  const savedEnv = { ...process.env };
  const savedPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
    blurHandler = null;
    beforeInputHandler = null;
    delete process.env.ELECTRON_RENDERER_URL;
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    Object.defineProperty(process, 'platform', { value: savedPlatform, configurable: true });
  });

  describe('dialog-open IPC', () => {
    it('module registers window:dialog-open handler', () => {
      expect(mocks.ipcHandlers['window:dialog-open']).toBeDefined();
    });
  });

  describe('createTrayWindow', () => {
    it('creates frameless hidden popup with correct options', () => {
      createTrayWindow();
      const opts = mocks.bwConstructorArgs as Record<string, unknown>;
      expect(opts.frame).toBe(false);
      expect(opts.show).toBe(false);
      expect(opts.skipTaskbar).toBe(true);
      expect(opts.resizable).toBe(false);
      expect(opts.alwaysOnTop).toBe(true);
      expect(opts.width).toBe(400);
      expect(opts.height).toBe(520);
    });

    it('enforces security settings', () => {
      createTrayWindow();
      const opts = mocks.bwConstructorArgs as { webPreferences: Record<string, unknown> };
      expect(opts.webPreferences.contextIsolation).toBe(true);
      expect(opts.webPreferences.nodeIntegration).toBe(false);
    });

    it('loads dev URL when ELECTRON_RENDERER_URL is set', () => {
      process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
      createTrayWindow();
      expect(mockLoadURL).toHaveBeenCalledWith('http://localhost:5173');
      expect(mockLoadFile).not.toHaveBeenCalled();
    });

    it('loads HTML file when ELECTRON_RENDERER_URL is not set', () => {
      createTrayWindow();
      expect(mockLoadFile).toHaveBeenCalled();
      expect(mockLoadURL).not.toHaveBeenCalled();
    });

    it('registers blur handler', () => {
      createTrayWindow();
      expect(mockWinOn).toHaveBeenCalledWith('blur', expect.any(Function));
    });

    it('blur handler hides window via app.hide on darwin', () => {
      createTrayWindow();
      blurHandler!();
      expect(mockAppHide).toHaveBeenCalled();
      expect(mockHide).not.toHaveBeenCalled();
    });

    it('blur handler uses win.hide on non-darwin', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      createTrayWindow();
      blurHandler!();
      expect(mockHide).toHaveBeenCalled();
      expect(mockAppHide).not.toHaveBeenCalled();
    });

    it('blur handler does NOT hide when devtools are open', () => {
      createTrayWindow();
      mockIsDevToolsOpened.mockReturnValueOnce(true);
      blurHandler!();
      expect(mockAppHide).not.toHaveBeenCalled();
      expect(mockHide).not.toHaveBeenCalled();
    });

    it('blur handler hides the window even when a dialog is open', () => {
      mocks.ipcHandlers['window:dialog-open']({}, true);

      createTrayWindow();
      blurHandler!();
      expect(mockAppHide).toHaveBeenCalled();

      mocks.ipcHandlers['window:dialog-open']({}, false);
    });

    it('registers a before-input-event handler on webContents', () => {
      createTrayWindow();
      expect(mockWebContentsOn).toHaveBeenCalledWith('before-input-event', expect.any(Function));
    });

    it('Escape keydown hides the window via app.hide on darwin', () => {
      createTrayWindow();
      beforeInputHandler!({ preventDefault: vi.fn() }, { type: 'keyDown', key: 'Escape' });
      expect(mockAppHide).toHaveBeenCalled();
    });

    it('Escape keydown does NOT hide when a dialog is open', () => {
      mocks.ipcHandlers['window:dialog-open']({}, true);
      createTrayWindow();
      beforeInputHandler!({ preventDefault: vi.fn() }, { type: 'keyDown', key: 'Escape' });
      expect(mockAppHide).not.toHaveBeenCalled();
      expect(mockHide).not.toHaveBeenCalled();
      mocks.ipcHandlers['window:dialog-open']({}, false);
    });

    it('non-Escape keydown does NOT hide the window', () => {
      createTrayWindow();
      beforeInputHandler!({ preventDefault: vi.fn() }, { type: 'keyDown', key: 'Enter' });
      expect(mockAppHide).not.toHaveBeenCalled();
      expect(mockHide).not.toHaveBeenCalled();
    });

    it('Escape keyup does NOT hide the window', () => {
      createTrayWindow();
      beforeInputHandler!({ preventDefault: vi.fn() }, { type: 'keyUp', key: 'Escape' });
      expect(mockAppHide).not.toHaveBeenCalled();
      expect(mockHide).not.toHaveBeenCalled();
    });

    it('window:hide IPC hides the window via app.hide on darwin', () => {
      createTrayWindow();
      mocks.ipcHandlers['window:hide']({});
      expect(mockAppHide).toHaveBeenCalled();
    });
  });

  describe('getWindowPosition', () => {
    const win = { getBounds: mockGetBounds } as unknown as Electron.BrowserWindow;
    const trayBounds = { x: 700, y: 0, width: 24, height: 24 };

    it('positions centered below tray on macOS', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      const pos = getWindowPosition(win, trayBounds);
      expect(pos.x).toBe(512);
      expect(pos.y).toBe(28);
    });

    it('positions above bottom taskbar on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      // Windows with bottom taskbar: workArea starts at y=0, height is less than screen height
      (screen.getDisplayNearestPoint as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        workArea: { x: 0, y: 0, width: 1440, height: 860 },
        bounds: { x: 0, y: 0, width: 1440, height: 900 },
      });
      const pos = getWindowPosition(win, trayBounds);
      expect(pos.x).toBe(512);
      expect(pos.y).toBe(336); // 0 + 860 - 520 - 4
    });

    it('positions below top taskbar', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      (screen.getDisplayNearestPoint as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        workArea: { x: 0, y: 40, width: 1440, height: 860 },
        bounds: { x: 0, y: 0, width: 1440, height: 900 },
      });
      const pos = getWindowPosition(win, trayBounds);
      expect(pos.y).toBe(44); // workArea.y + 4
    });

    it('falls back to bottom-right for left/right taskbar', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      (screen.getDisplayNearestPoint as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        workArea: { x: 60, y: 0, width: 1380, height: 900 },
        bounds: { x: 0, y: 0, width: 1440, height: 900 },
      });
      const pos = getWindowPosition(win, trayBounds);
      expect(pos.x).toBe(1032); // 60 + 1380 - 400 - 8
      expect(pos.y).toBe(372); // 0 + 900 - 520 - 8
    });

    it('clamps position to screen bounds', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      const edgeBounds = { x: 1400, y: 0, width: 24, height: 24 };
      const pos = getWindowPosition(win, edgeBounds);
      // max x = 0 + 1440 - 400 = 1040
      expect(pos.x).toBeLessThanOrEqual(1040);
    });
  });

  describe('showWindow', () => {
    it('sets position, shows, and focuses on darwin (with app.show)', () => {
      const win = createTrayWindow();
      const bounds = { x: 700, y: 0, width: 24, height: 24 };
      showWindow(win, bounds);
      expect(mockSetPosition).toHaveBeenCalled();
      expect(mockAppShow).toHaveBeenCalled();
      expect(mockShow).toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalled();
    });

    it('does not call app.show on non-darwin', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      const win = createTrayWindow();
      const bounds = { x: 700, y: 0, width: 24, height: 24 };
      showWindow(win, bounds);
      expect(mockAppShow).not.toHaveBeenCalled();
      expect(mockShow).toHaveBeenCalled();
    });
  });

  describe('hideWindow', () => {
    it('uses app.hide on darwin', () => {
      const win = createTrayWindow();
      hideWindow(win);
      expect(mockAppHide).toHaveBeenCalled();
      expect(mockHide).not.toHaveBeenCalled();
    });

    it('uses win.hide on non-darwin', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      const win = createTrayWindow();
      hideWindow(win);
      expect(mockHide).toHaveBeenCalled();
      expect(mockAppHide).not.toHaveBeenCalled();
    });
  });

  describe('toggleWindow', () => {
    it('shows when hidden', () => {
      const win = createTrayWindow();
      mockIsVisible.mockReturnValueOnce(false);
      const bounds = { x: 700, y: 0, width: 24, height: 24 };
      toggleWindow(win, bounds);
      expect(mockShow).toHaveBeenCalled();
    });

    it('hides when visible', () => {
      const win = createTrayWindow();
      mockIsVisible.mockReturnValueOnce(true);
      const bounds = { x: 700, y: 0, width: 24, height: 24 };
      toggleWindow(win, bounds);
      expect(mockAppHide).toHaveBeenCalled();
      expect(mockShow).not.toHaveBeenCalled();
    });
  });

  describe('debug logging', () => {
    it('logs window show', () => {
      const win = createTrayWindow();
      const bounds = { x: 0, y: 0, width: 24, height: 24 };
      showWindow(win, bounds);
      expect(mocks.debugLog).toHaveBeenCalledWith('window', 'show');
    });

    it('logs window hide', () => {
      const win = createTrayWindow();
      hideWindow(win);
      expect(mocks.debugLog).toHaveBeenCalledWith('window', 'hide');
    });

    it('logs window toggle with visible=true when window is visible', () => {
      const win = createTrayWindow();
      mockIsVisible.mockReturnValueOnce(true);
      toggleWindow(win, { x: 0, y: 0, width: 24, height: 24 });
      expect(mocks.debugLog).toHaveBeenCalledWith('window', 'toggle', { visible: true });
    });

    it('logs window toggle with visible=false when window is hidden', () => {
      const win = createTrayWindow();
      mockIsVisible.mockReturnValueOnce(false);
      toggleWindow(win, { x: 0, y: 0, width: 24, height: 24 });
      expect(mocks.debugLog).toHaveBeenCalledWith('window', 'toggle', { visible: false });
    });
  });
});
