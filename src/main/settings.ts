import fs from 'fs';
import path from 'path';

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  dbPath: string;
  valuesHidden: boolean;
  shortcuts: {
    globalToggle: string;
    newNote: string;
    focusSearch: string;
  };
}

export function getDefaultSettings(): AppSettings {
  return {
    theme: 'system',
    dbPath: '',
    valuesHidden: false,
    shortcuts: {
      globalToggle: 'CmdOrCtrl+Shift+K',
      newNote: 'CmdOrCtrl+N',
      focusSearch: 'CmdOrCtrl+F',
    },
  };
}

export function loadSettings(filePath: string): AppSettings {
  const defaults = getDefaultSettings();
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const stored = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...defaults,
      ...stored,
      shortcuts: {
        ...defaults.shortcuts,
        ...(stored.shortcuts ?? {}),
      },
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(filePath: string, settings: AppSettings): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
}

export function moveDbFile(
  oldPath: string,
  newPath: string,
): { ok: boolean; error?: string } {
  if (oldPath === newPath) return { ok: true };
  if (fs.existsSync(newPath)) {
    return { ok: false, error: 'Target file already exists' };
  }
  try {
    fs.renameSync(oldPath, newPath);
  } catch {
    fs.copyFileSync(oldPath, newPath);
    fs.unlinkSync(oldPath);
  }
  return { ok: true };
}
