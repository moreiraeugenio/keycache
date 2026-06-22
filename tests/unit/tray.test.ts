import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  isPackaged: false,
  appName: 'Keycache',
  setToolTip: vi.fn(),
  popUpContextMenu: vi.fn(),
  getBounds: vi.fn().mockReturnValue({ x: 100, y: 0, width: 24, height: 24 }),
  trayOn: vi.fn(),
  buildFromTemplate: vi.fn().mockReturnValue({ items: [] }),
  trayIconArg: null as unknown,
  setTemplateImage: vi.fn(),
  createFromPath: vi.fn(),
  debugLog: vi.fn(),
}));

vi.mock('../../src/main/debug', () => ({
  debugLog: mocks.debugLog,
  registerDebugIpc: vi.fn(),
}));

vi.mock('electron', () => {
  class MockNativeImage {
    setTemplateImage = mocks.setTemplateImage;
  }

  mocks.createFromPath.mockImplementation((p: string) => {
    const img = new MockNativeImage();
    (img as unknown as { __path: string }).__path = p;
    return img;
  });

  return {
    Tray: class MockTray {
      setToolTip = mocks.setToolTip;
      popUpContextMenu = mocks.popUpContextMenu;
      getBounds = mocks.getBounds;
      on = mocks.trayOn;
      constructor(icon: unknown) {
        mocks.trayIconArg = icon;
      }
    },
    Menu: {
      buildFromTemplate: mocks.buildFromTemplate,
    },
    app: {
      get isPackaged() {
        return mocks.isPackaged;
      },
      getName: () => mocks.appName,
    },
    nativeImage: {
      createFromPath: mocks.createFromPath,
    },
  };
});

import { createTray, getTrayIconPath } from '../../src/main/tray';

describe('tray', () => {
  const savedPlatform = process.platform;
  const savedResourcesPath = (process as { resourcesPath?: string }).resourcesPath;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPackaged = false;
    mocks.appName = 'Keycache';
    mocks.trayIconArg = null;
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: savedPlatform, configurable: true });
    (process as { resourcesPath?: string }).resourcesPath = savedResourcesPath;
  });

  describe('getTrayIconPath', () => {
    it('returns dev template on macOS in dev', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      const p = getTrayIconPath();
      expect(p).toContain('trayIconTemplate-dev.png');
      expect(p).toContain('resources');
    });

    it('returns non-dev template on macOS when packaged', () => {
      mocks.isPackaged = true;
      (process as { resourcesPath?: string }).resourcesPath = '/packaged/resources';
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      const p = getTrayIconPath();
      expect(p).toBe('/packaged/resources/trayIconTemplate.png');
    });

    it('returns devbuild template on macOS when packaged as Keycache Dev', () => {
      mocks.isPackaged = true;
      mocks.appName = 'Keycache Dev';
      (process as { resourcesPath?: string }).resourcesPath = '/packaged/resources';
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      const p = getTrayIconPath();
      expect(p).toBe('/packaged/resources/trayIconTemplate-devbuild.png');
    });

    it('returns .ico on Windows in dev', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      const p = getTrayIconPath();
      expect(p).toContain('tray-icon.ico');
    });

    it('returns .png on Linux in dev', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      const p = getTrayIconPath();
      expect(p).toContain('tray-icon.png');
    });

  });

  describe('createTray', () => {
    it('creates tray with correct icon and tooltip', () => {
      const tray = createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn());
      expect(mocks.createFromPath).toHaveBeenCalled();
      expect(mocks.setToolTip).toHaveBeenCalledWith('Keycache');
      expect(tray).toBeDefined();
    });

    it('marks icon as template on macOS', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn());
      expect(mocks.setTemplateImage).toHaveBeenCalledWith(true);
      expect(mocks.setTemplateImage).toHaveBeenCalledTimes(1);
    });

    it('does not set template image on non-macOS', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn());
      expect(mocks.setTemplateImage).not.toHaveBeenCalled();
    });

    it('builds context menu with Settings, separator, About, and Quit', () => {
      createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn());
      const template = mocks.buildFromTemplate.mock.calls[0][0];
      expect(template).toHaveLength(4);
      expect(template[0].label).toBe('Settings');
      expect(template[1].type).toBe('separator');
      expect(template[2].label).toBe('About Keycache');
      expect(template[3].label).toBe('Quit Keycache');
    });

    it('Settings menu item calls onSettings', () => {
      const onSettings = vi.fn();
      createTray(vi.fn(), onSettings, vi.fn(), vi.fn());
      const template = mocks.buildFromTemplate.mock.calls[0][0];
      template[0].click();
      expect(onSettings).toHaveBeenCalled();
    });

    it('About menu item calls onAbout', () => {
      const onAbout = vi.fn();
      createTray(vi.fn(), vi.fn(), onAbout, vi.fn());
      const template = mocks.buildFromTemplate.mock.calls[0][0];
      template[2].click();
      expect(onAbout).toHaveBeenCalled();
    });

    it('Quit menu item calls onQuit', () => {
      const onQuit = vi.fn();
      createTray(vi.fn(), vi.fn(), vi.fn(), onQuit);
      const template = mocks.buildFromTemplate.mock.calls[0][0];
      template[3].click();
      expect(onQuit).toHaveBeenCalled();
    });

    it('registers click handler that calls onToggle', () => {
      const onToggle = vi.fn();
      createTray(onToggle, vi.fn(), vi.fn(), vi.fn());
      const clickHandler = mocks.trayOn.mock.calls.find((c) => c[0] === 'click')![1];
      const bounds = { x: 50, y: 0, width: 24, height: 24 };
      clickHandler({}, bounds);
      expect(onToggle).toHaveBeenCalledWith(bounds);
    });

    it('right-click shows context menu via popUpContextMenu', () => {
      createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn());
      const rightClickHandler = mocks.trayOn.mock.calls.find((c) => c[0] === 'right-click')![1];
      rightClickHandler();
      expect(mocks.popUpContextMenu).toHaveBeenCalled();
    });

    describe('debug logging', () => {
      it('logs tray click', () => {
        createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn());
        const clickHandler = mocks.trayOn.mock.calls.find((c) => c[0] === 'click')![1];
        clickHandler({}, { x: 0, y: 0, width: 24, height: 24 });
        expect(mocks.debugLog).toHaveBeenCalledWith('tray', 'click');
      });

      it('logs tray menu Settings', () => {
        createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn());
        const template = mocks.buildFromTemplate.mock.calls[0][0];
        template[0].click();
        expect(mocks.debugLog).toHaveBeenCalledWith('tray', 'menu', { item: 'Settings' });
      });

      it('logs tray menu About', () => {
        createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn());
        const template = mocks.buildFromTemplate.mock.calls[0][0];
        template[2].click();
        expect(mocks.debugLog).toHaveBeenCalledWith('tray', 'menu', { item: 'About' });
      });

      it('logs tray menu Quit', () => {
        createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn());
        const template = mocks.buildFromTemplate.mock.calls[0][0];
        template[3].click();
        expect(mocks.debugLog).toHaveBeenCalledWith('tray', 'menu', { item: 'Quit' });
      });
    });
  });
});
