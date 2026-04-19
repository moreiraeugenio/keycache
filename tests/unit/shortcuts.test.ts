import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  register: vi.fn().mockReturnValue(true),
  unregisterAll: vi.fn(),
}));

vi.mock('electron', () => ({
  globalShortcut: {
    register: mocks.register,
    unregisterAll: mocks.unregisterAll,
  },
}));

import { registerShortcuts, unregisterShortcuts } from '../../src/main/shortcuts';

describe('shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerShortcuts', () => {
    it('registers the given accelerator', () => {
      const toggle = vi.fn();
      registerShortcuts('CmdOrCtrl+Shift+K', toggle);
      expect(mocks.register).toHaveBeenCalledWith('CmdOrCtrl+Shift+K', toggle);
    });

    it('registers a custom accelerator', () => {
      const toggle = vi.fn();
      registerShortcuts('CmdOrCtrl+Shift+J', toggle);
      expect(mocks.register).toHaveBeenCalledWith('CmdOrCtrl+Shift+J', toggle);
    });

    it('logs warning when registration fails', () => {
      mocks.register.mockReturnValueOnce(false);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerShortcuts('CmdOrCtrl+Shift+K', vi.fn());
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('CmdOrCtrl+Shift+K'));
      warn.mockRestore();
    });
  });

  describe('unregisterShortcuts', () => {
    it('calls globalShortcut.unregisterAll', () => {
      unregisterShortcuts();
      expect(mocks.unregisterAll).toHaveBeenCalled();
    });
  });
});
