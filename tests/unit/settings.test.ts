import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  loadSettings,
  saveSettings,
  getDefaultSettings,
  moveDataFile,
} from '../../src/main/settings';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keycache-settings-'));
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
    expect(defaults.shortcuts.globalToggle).toBe('CmdOrCtrl+Shift+K');
    expect(defaults.shortcuts.newNote).toBe('CmdOrCtrl+N');
    expect(defaults.shortcuts.focusSearch).toBe('CmdOrCtrl+F');
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
  });

  it('loads fully stored settings', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    const stored = {
      theme: 'light' as const,
      dataFilePath: '/custom/path.json',
      valuesHidden: true,
      shortcuts: {
        globalToggle: 'CmdOrCtrl+Shift+J',
        newNote: 'CmdOrCtrl+M',
        focusSearch: 'CmdOrCtrl+G',
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
