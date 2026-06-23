import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const debugMock = vi.hoisted(() => ({ debugLog: vi.fn() }));
vi.mock('../../src/main/debug', () => ({
  debugLog: debugMock.debugLog,
  registerDebugIpc: vi.fn(),
}));

import {
  loadSettings,
  saveSettings,
  getDefaultSettings,
  moveDataFile,
} from '../../src/main/settings';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keycache-settings-'));
  debugMock.debugLog.mockClear();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('getDefaultSettings', () => {
  it('returns expected defaults', () => {
    const defaults = getDefaultSettings();
    expect(defaults.theme).toBe('system');
    expect(defaults.dataFilePath).toBe('');
    expect(defaults.valuesHidden).toBe(false);
    expect(defaults.startAtLogin).toBe(false);
    expect(defaults.shortcuts.globalToggle).toBe('CmdOrCtrl+Shift+K');
    expect(defaults.shortcuts.newNote).toBe('CmdOrCtrl+N');
    expect(defaults.shortcuts.focusSearch).toBe('CmdOrCtrl+F');
    expect(defaults.shortcuts.openSettings).toBe('CmdOrCtrl+,');
    expect(defaults.shortcuts.toggleVisibility).toBe('CmdOrCtrl+Shift+H');
  });
});

describe('loadSettings', () => {
  it('returns defaults when file does not exist', () => {
    const settings = loadSettings(path.join(tmpDir, 'missing.json'));
    expect(settings).toEqual(getDefaultSettings());
  });

  it('returns defaults when file contains invalid JSON', () => {
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, 'not-json', 'utf-8');
    const settings = loadSettings(filePath);
    expect(settings).toEqual(getDefaultSettings());
  });

  it('merges stored values with defaults', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    fs.writeFileSync(filePath, JSON.stringify({ theme: 'dark' }), 'utf-8');
    const settings = loadSettings(filePath);
    expect(settings.theme).toBe('dark');
    expect(settings.dataFilePath).toBe('');
    expect(settings.valuesHidden).toBe(false);
    expect(settings.shortcuts).toEqual(getDefaultSettings().shortcuts);
  });

  it('preserves stored valuesHidden when present', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    fs.writeFileSync(filePath, JSON.stringify({ valuesHidden: true }), 'utf-8');
    const settings = loadSettings(filePath);
    expect(settings.valuesHidden).toBe(true);
  });

  it('preserves stored startAtLogin when present', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    fs.writeFileSync(filePath, JSON.stringify({ startAtLogin: true }), 'utf-8');
    const settings = loadSettings(filePath);
    expect(settings.startAtLogin).toBe(true);
  });

  it('merges partial shortcuts with defaults', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({ shortcuts: { newNote: 'CmdOrCtrl+M' } }),
      'utf-8',
    );
    const settings = loadSettings(filePath);
    expect(settings.shortcuts.newNote).toBe('CmdOrCtrl+M');
    expect(settings.shortcuts.globalToggle).toBe('CmdOrCtrl+Shift+K');
    expect(settings.shortcuts.focusSearch).toBe('CmdOrCtrl+F');
    expect(settings.shortcuts.openSettings).toBe('CmdOrCtrl+,');
    expect(settings.shortcuts.toggleVisibility).toBe('CmdOrCtrl+Shift+H');
  });

  it('loads fully stored settings', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    const stored = {
      theme: 'light' as const,
      dataFilePath: '/custom/path.json',
      valuesHidden: true,
      startAtLogin: true,
      shortcuts: {
        globalToggle: 'CmdOrCtrl+Shift+J',
        newNote: 'CmdOrCtrl+M',
        focusSearch: 'CmdOrCtrl+G',
        openSettings: 'CmdOrCtrl+.',
        toggleVisibility: 'CmdOrCtrl+Shift+V',
      },
    };
    fs.writeFileSync(filePath, JSON.stringify(stored), 'utf-8');
    expect(loadSettings(filePath)).toEqual(stored);
  });
});

describe('saveSettings', () => {
  it('writes settings as formatted JSON', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    const settings = getDefaultSettings();
    saveSettings(filePath, settings);
    const raw = fs.readFileSync(filePath, 'utf-8');
    expect(JSON.parse(raw)).toEqual(settings);
    expect(raw).toContain('\n');
  });

  it('creates parent directories if needed', () => {
    const filePath = path.join(tmpDir, 'nested', 'dir', 'settings.json');
    saveSettings(filePath, getDefaultSettings());
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('atomic write does not leave .tmp file', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    saveSettings(filePath, getDefaultSettings());
    expect(fs.existsSync(filePath + '.tmp')).toBe(false);
  });
});

describe('moveDataFile', () => {
  it('returns ok for same path', () => {
    const p = path.join(tmpDir, 'same.json');
    fs.writeFileSync(p, '{}');
    expect(moveDataFile(p, p)).toEqual({ ok: true });
  });

  it('returns ok when source does not exist (no-op)', () => {
    const src = path.join(tmpDir, 'missing.json');
    const dst = path.join(tmpDir, 'dst.json');
    expect(moveDataFile(src, dst)).toEqual({ ok: true });
    expect(fs.existsSync(dst)).toBe(false);
  });

  it('moves file to new path', () => {
    const src = path.join(tmpDir, 'src.json');
    const dst = path.join(tmpDir, 'dst.json');
    fs.writeFileSync(src, '{"data":1}');
    const result = moveDataFile(src, dst);
    expect(result).toEqual({ ok: true });
    expect(fs.existsSync(src)).toBe(false);
    expect(fs.readFileSync(dst, 'utf-8')).toBe('{"data":1}');
  });

  it('returns error if target exists', () => {
    const src = path.join(tmpDir, 'src.json');
    const dst = path.join(tmpDir, 'dst.json');
    fs.writeFileSync(src, '{}');
    fs.writeFileSync(dst, '{}');
    const result = moveDataFile(src, dst);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('falls back to copy+delete on cross-device error', () => {
    const src = path.join(tmpDir, 'src.json');
    const dst = path.join(tmpDir, 'dst.json');
    fs.writeFileSync(src, '{"cross":true}');

    const origRename = fs.renameSync;
    fs.renameSync = () => {
      const err = new Error('EXDEV') as NodeJS.ErrnoException;
      err.code = 'EXDEV';
      throw err;
    };

    try {
      const result = moveDataFile(src, dst);
      expect(result).toEqual({ ok: true });
      expect(fs.existsSync(src)).toBe(false);
      expect(fs.readFileSync(dst, 'utf-8')).toBe('{"cross":true}');
    } finally {
      fs.renameSync = origRename;
    }
  });

  it('rethrows non-EXDEV rename errors', () => {
    const src = path.join(tmpDir, 'src.json');
    const dst = path.join(tmpDir, 'dst.json');
    fs.writeFileSync(src, '{}');

    const origRename = fs.renameSync;
    fs.renameSync = () => {
      const err = new Error('EACCES') as NodeJS.ErrnoException;
      err.code = 'EACCES';
      throw err;
    };

    try {
      expect(() => moveDataFile(src, dst)).toThrow(/EACCES/);
      expect(fs.existsSync(src)).toBe(true);
      expect(fs.existsSync(dst)).toBe(false);
    } finally {
      fs.renameSync = origRename;
    }
  });
});

describe('debug logging', () => {
  it('logs file read with full merged settings on successful loadSettings', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    fs.writeFileSync(filePath, JSON.stringify({ theme: 'dark' }), 'utf-8');
    loadSettings(filePath);
    expect(debugMock.debugLog).toHaveBeenCalledWith('file', 'read', {
      file: 'settings.json',
      ...getDefaultSettings(),
      theme: 'dark',
    });
  });

  it('logs file read with fallback flag when settings file is invalid', () => {
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, 'not-json', 'utf-8');
    loadSettings(filePath);
    expect(debugMock.debugLog).toHaveBeenCalledWith('file', 'read', {
      file: 'settings.json',
      fallback: true,
    });
  });

  it('logs file write on saveSettings', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    const settings = { ...getDefaultSettings(), theme: 'light' as const };
    saveSettings(filePath, settings);
    expect(debugMock.debugLog).toHaveBeenCalledWith('file', 'write', {
      file: 'settings.json',
      theme: 'light',
    });
  });

  it('logs file move on successful moveDataFile', () => {
    const src = path.join(tmpDir, 'src.json');
    const dst = path.join(tmpDir, 'dst.json');
    fs.writeFileSync(src, '{}');
    moveDataFile(src, dst);
    expect(debugMock.debugLog).toHaveBeenCalledWith('file', 'move', {
      from: src,
      to: dst,
    });
  });

  it('does not log move when source does not exist', () => {
    const src = path.join(tmpDir, 'missing.json');
    const dst = path.join(tmpDir, 'dst.json');
    moveDataFile(src, dst);
    expect(debugMock.debugLog).not.toHaveBeenCalledWith(
      'file',
      'move',
      expect.anything(),
    );
  });
});
