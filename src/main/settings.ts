import fs from 'fs';
import path from 'path';
import { debugLog } from './debug';

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  dataFilePath: string;
  valuesHidden: boolean;
  shortcuts: {
    globalToggle: string;
    newNote: string;
    focusSearch: string;
    openSettings: string;
    toggleVisibility: string;
  };
}

export function getDefaultSettings(): AppSettings {
  return {
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
  };
}

export function loadSettings(filePath: string): AppSettings {
  const defaults = getDefaultSettings();
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const stored = JSON.parse(raw) as Partial<AppSettings>;
    const merged = {
      ...defaults,
      ...stored,
      shortcuts: {
        ...defaults.shortcuts,
        ...(stored.shortcuts ?? {}),
      },
    };
    debugLog('file', 'read', { file: 'settings.json', ...merged });
    return merged;
  } catch {
    debugLog('file', 'read', { file: 'settings.json', fallback: true });
    return defaults;
  }
}

export function saveSettings(filePath: string, settings: AppSettings): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
  debugLog('file', 'write', { file: 'settings.json', theme: settings.theme });
}

export function moveDataFile(
  oldPath: string,
  newPath: string,
): { ok: boolean; error?: string } {
  if (oldPath === newPath) return { ok: true };
  if (!fs.existsSync(oldPath)) return { ok: true };
  if (fs.existsSync(newPath)) {
    return { ok: false, error: 'Target file already exists' };
  }
  try {
    fs.renameSync(oldPath, newPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
    fs.copyFileSync(oldPath, newPath);
    fs.unlinkSync(oldPath);
  }
  debugLog('file', 'move', { from: oldPath, to: newPath });
  return { ok: true };
}
