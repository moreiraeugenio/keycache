import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  ipcMainOn: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { on: mocks.ipcMainOn },
}));

import { isDebugEnabled, debugLog, registerDebugIpc } from '../../src/main/debug';

describe('debug', () => {
  const savedEnv = process.env.ELECTRON_RENDERER_URL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.ELECTRON_RENDERER_URL;
    else process.env.ELECTRON_RENDERER_URL = savedEnv;
  });

  describe('isDebugEnabled', () => {
    it('returns true when ELECTRON_RENDERER_URL is set', () => {
      process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
      expect(isDebugEnabled()).toBe(true);
    });

    it('returns false when ELECTRON_RENDERER_URL is unset', () => {
      delete process.env.ELECTRON_RENDERER_URL;
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe('debugLog', () => {
    let logSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    it('is silent when gate is off', () => {
      delete process.env.ELECTRON_RENDERER_URL;
      debugLog('scope', 'event');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('prints scope and event when gate is on (no trailing space)', () => {
      process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
      debugLog('button', 'add-btn');
      expect(logSpy).toHaveBeenCalledWith('[debug] button add-btn');
    });

    it('appends key=value pairs from details', () => {
      process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
      debugLog('file', 'read', { file: 'data.json', notes: 3 });
      expect(logSpy).toHaveBeenCalledWith('[debug] file read file=data.json notes=3');
    });

    it('quotes values containing whitespace', () => {
      process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
      debugLog('file', 'move', { from: '/a/b', to: '/c d/e' });
      expect(logSpy).toHaveBeenCalledWith('[debug] file move from=/a/b to="/c d/e"');
    });

    it('prints valid line when details is undefined', () => {
      process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
      debugLog('shortcut', 'newNote', undefined);
      expect(logSpy).toHaveBeenCalledWith('[debug] shortcut newNote');
    });

    it('handles boolean values', () => {
      process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
      debugLog('window', 'toggle', { visible: true });
      expect(logSpy).toHaveBeenCalledWith('[debug] window toggle visible=true');
    });
  });

  describe('registerDebugIpc', () => {
    it('does nothing when gate is off', () => {
      delete process.env.ELECTRON_RENDERER_URL;
      registerDebugIpc();
      expect(mocks.ipcMainOn).not.toHaveBeenCalled();
    });

    it('registers debug:log handler when gate is on', () => {
      process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
      registerDebugIpc();
      expect(mocks.ipcMainOn).toHaveBeenCalledWith('debug:log', expect.any(Function));
    });

    it('registered handler forwards args to debugLog', () => {
      process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      registerDebugIpc();
      const handler = mocks.ipcMainOn.mock.calls[0][1];
      handler({}, 'scope', 'event', { foo: 'bar' });
      expect(logSpy).toHaveBeenCalledWith('[debug] scope event foo=bar');
      logSpy.mockRestore();
    });
  });
});
